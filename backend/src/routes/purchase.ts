import { Router, type Response, type NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, requireAdmin, type AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(authMiddleware);
router.use(requireAdmin);

async function nextRequisitionNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const pattern = `REQ-${year}-`;
  const last = await prisma.requisition.findFirst({
    where: { requisitionNumber: { startsWith: pattern } },
    orderBy: { requisitionNumber: 'desc' },
  });
  const num = last ? parseInt(last.requisitionNumber.split('-').pop() || '0', 10) + 1 : 1;
  return `${pattern}${String(num).padStart(4, '0')}`;
}

async function nextPurchaseBillNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const pattern = `PUR-${year}-`;
  const last = await prisma.purchaseBill.findFirst({
    where: { billNumber: { startsWith: pattern } },
    orderBy: { billNumber: 'desc' },
  });
  const num = last ? parseInt(last.billNumber.split('-').pop() || '0', 10) + 1 : 1;
  return `${pattern}${String(num).padStart(4, '0')}`;
}

// Vendors - list, create, update
router.get('/vendors', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const list = await prisma.vendor.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.get('/vendors/all', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const list = await prisma.vendor.findMany({ orderBy: { name: 'asc' } });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/vendors', [
  body('name').trim().notEmpty(),
  body('contactPerson').optional().trim(),
  body('phone').optional().trim(),
  body('email').optional().trim(),
  body('address').optional().trim(),
  body('notes').optional().trim(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const vendor = await prisma.vendor.create({
      data: {
        name: req.body.name.trim(),
        contactPerson: req.body.contactPerson?.trim() || null,
        phone: req.body.phone?.trim() || null,
        email: req.body.email?.trim() || null,
        address: req.body.address?.trim() || null,
        notes: req.body.notes?.trim() || null,
      },
    });
    res.status(201).json(vendor);
  } catch (e) {
    next(e);
  }
});

router.patch('/vendors/:id', [
  body('name').optional().trim().notEmpty(),
  body('contactPerson').optional().trim(),
  body('phone').optional().trim(),
  body('email').optional().trim(),
  body('address').optional().trim(),
  body('notes').optional().trim(),
  body('isActive').optional().isBoolean(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const data: Record<string, unknown> = {};
    if (req.body.name !== undefined) data.name = req.body.name.trim();
    if (req.body.contactPerson !== undefined) data.contactPerson = req.body.contactPerson?.trim() || null;
    if (req.body.phone !== undefined) data.phone = req.body.phone?.trim() || null;
    if (req.body.email !== undefined) data.email = req.body.email?.trim() || null;
    if (req.body.address !== undefined) data.address = req.body.address?.trim() || null;
    if (req.body.notes !== undefined) data.notes = req.body.notes?.trim() || null;
    if (req.body.isActive !== undefined) data.isActive = req.body.isActive;
    const vendor = await prisma.vendor.update({
      where: { id: req.params.id },
      data,
    });
    res.json(vendor);
  } catch (e) {
    next(e);
  }
});

// Requisitions - list, create, update status
router.get('/requisitions', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string | undefined;
    const where = status ? { status } : {};
    const list = await prisma.requisition.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/requisitions', [
  body('items').isArray(),
  body('items.*.productName').trim().notEmpty(),
  body('items.*.quantity').isFloat({ min: 0.01 }),
  body('items.*.unit').optional().trim(),
  body('items.*.estimatedRate').optional().isFloat({ min: 0 }),
  body('notes').optional().trim(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const items = req.body.items as { productName: string; quantity: number; unit?: string; estimatedRate?: number }[];
    if (items.length === 0) throw new AppError(400, 'Add at least one item');
    const reqNum = await nextRequisitionNumber();
    const requisition = await prisma.requisition.create({
      data: {
        requisitionNumber: reqNum,
        requestedBy: req.user!.id,
        status: 'PENDING',
        notes: req.body.notes?.trim() || null,
        items: {
          create: items.map((i) => ({
            productName: i.productName.trim(),
            quantity: i.quantity,
            unit: i.unit?.trim() || 'pcs',
            estimatedRate: i.estimatedRate ?? null,
          })),
        },
      },
      include: { items: true },
    });
    res.status(201).json(requisition);
  } catch (e) {
    next(e);
  }
});

router.patch('/requisitions/:id/status', [
  body('status').isIn(['PENDING', 'APPROVED', 'REJECTED', 'DRAFT']),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const requisition = await prisma.requisition.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
      include: { items: true },
    });
    res.json(requisition);
  } catch (e) {
    next(e);
  }
});

// Purchase Bills - list, create, get
router.get('/purchase-bills', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string | undefined;
    const where = status ? { status } : {};
    const list = await prisma.purchaseBill.findMany({
      where,
      include: { vendor: true, requisition: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/purchase-bills', [
  body('vendorId').trim().notEmpty(),
  body('requisitionId').optional().trim(),
  body('items').isArray(),
  body('items.*.productName').trim().notEmpty(),
  body('items.*.quantity').isFloat({ min: 0.01 }),
  body('items.*.unit').optional().trim(),
  body('items.*.rate').isFloat({ min: 0 }),
  body('notes').optional().trim(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const items = req.body.items as { productName: string; quantity: number; unit?: string; rate: number }[];
    if (items.length === 0) throw new AppError(400, 'Add at least one item');
    const itemsWithAmount = items.map((i) => ({
      ...i,
      unit: i.unit || 'pcs',
      amount: i.quantity * i.rate,
    }));
    const totalAmount = itemsWithAmount.reduce((s, i) => s + i.amount, 0);
    const billNum = await nextPurchaseBillNumber();
    const bill = await prisma.purchaseBill.create({
      data: {
        billNumber: billNum,
        vendorId: req.body.vendorId,
        requisitionId: req.body.requisitionId || null,
        date: new Date(),
        items: itemsWithAmount,
        totalAmount,
        status: 'PENDING',
        notes: req.body.notes?.trim() || null,
      },
      include: { vendor: true, requisition: true },
    });
    res.status(201).json(bill);
  } catch (e) {
    next(e);
  }
});

router.get('/purchase-bills/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const bill = await prisma.purchaseBill.findUnique({
      where: { id: req.params.id },
      include: { vendor: true, requisition: { include: { items: true } } },
    });
    if (!bill) throw new AppError(404, 'Purchase bill not found');
    res.json(bill);
  } catch (e) {
    next(e);
  }
});

router.patch('/purchase-bills/:id/status', [
  body('status').isIn(['PENDING', 'RECEIVED', 'PAID']),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const bill = await prisma.purchaseBill.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
      include: { vendor: true },
    });
    res.json(bill);
  } catch (e) {
    next(e);
  }
});

export { router as purchaseRouter };
