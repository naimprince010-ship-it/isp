import { Router, type Response, type NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, requireRole, type AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(authMiddleware);
router.use(requireRole('ADMIN', 'RESELLER'));

async function nextProductInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const pattern = `PINV-${year}-`;
  const last = await prisma.productInvoice.findFirst({
    where: { invoiceNumber: { startsWith: pattern } },
    orderBy: { invoiceNumber: 'desc' },
  });
  const num = last ? parseInt(last.invoiceNumber.split('-').pop() || '0', 10) + 1 : 1;
  return `${pattern}${String(num).padStart(4, '0')}`;
}

async function nextServiceInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const pattern = `SINV-${year}-`;
  const last = await prisma.serviceInvoice.findFirst({
    where: { invoiceNumber: { startsWith: pattern } },
    orderBy: { invoiceNumber: 'desc' },
  });
  const num = last ? parseInt(last.invoiceNumber.split('-').pop() || '0', 10) + 1 : 1;
  return `${pattern}${String(num).padStart(4, '0')}`;
}

// Installation Fee - list, collect
router.get('/installation-fees', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const where = req.user?.role === 'RESELLER' && req.user?.resellerId
      ? { customer: { resellerId: req.user.resellerId } }
      : {};
    const list = await prisma.installationFee.findMany({
      where,
      include: { customer: { include: { user: { select: { name: true, phone: true } }, reseller: { select: { companyName: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/installation-fees', [
  body('customerId').trim().notEmpty(),
  body('amount').isFloat({ min: 0.01 }),
  body('method').isIn(['CASH', 'BKASH', 'NAGAD', 'ROCKET', 'BANK']),
  body('trxId').optional().trim(),
  body('notes').optional().trim(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    if (req.user?.role === 'RESELLER' && req.user?.resellerId) {
      const cust = await prisma.customerProfile.findUnique({ where: { id: req.body.customerId } });
      if (!cust || cust.resellerId !== req.user.resellerId) throw new AppError(403, 'Customer not under your reseller');
    }
    const fee = await prisma.installationFee.create({
      data: {
        customerId: req.body.customerId,
        amount: req.body.amount,
        method: req.body.method,
        trxId: req.body.trxId || null,
        collectedBy: req.user!.id,
        notes: req.body.notes || null,
      },
      include: { customer: { include: { user: true, reseller: true } } },
    });
    res.status(201).json(fee);
  } catch (e) {
    next(e);
  }
});

// Product Invoice - list, create, get (for print)
router.get('/product-invoices', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const where = req.user?.role === 'RESELLER' && req.user?.resellerId
      ? { OR: [{ resellerId: req.user.resellerId }, { customer: { resellerId: req.user.resellerId } }] }
      : {};
    const list = await prisma.productInvoice.findMany({
      where,
      include: { customer: { include: { user: { select: { name: true, phone: true } } } }, reseller: { select: { companyName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/product-invoices', [
  body('customerId').optional().trim(),
  body('items').isArray(),
  body('items.*.productName').trim().notEmpty(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('items.*.rate').isFloat({ min: 0 }),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const items = req.body.items as { productName: string; quantity: number; rate: number }[];
    const totalAmount = items.reduce((s, i) => s + i.quantity * i.rate, 0);
    const invNum = await nextProductInvoiceNumber();
    const inv = await prisma.productInvoice.create({
      data: {
        invoiceNumber: invNum,
        customerId: req.body.customerId || null,
        date: new Date(),
        items: items.map((i) => ({ ...i, amount: i.quantity * i.rate })),
        totalAmount,
        status: 'PAID',
      },
      include: { customer: { include: { user: true } }, reseller: true },
    });
    res.status(201).json(inv);
  } catch (e) {
    next(e);
  }
});

router.get('/product-invoices/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const inv = await prisma.productInvoice.findUnique({
      where: { id: req.params.id },
      include: { customer: { include: { user: true, reseller: true } } },
    });
    if (!inv) throw new AppError(404, 'Invoice not found');
    if (req.user?.role === 'RESELLER' && req.user?.resellerId) {
      const ok = inv.resellerId === req.user.resellerId || inv.customer?.resellerId === req.user.resellerId;
      if (!ok) throw new AppError(403, 'Forbidden');
    }
    res.json(inv);
  } catch (e) {
    next(e);
  }
});

// Service Invoice - list, create, get (for print)
router.get('/service-invoices', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const where = req.user?.role === 'RESELLER' && req.user?.resellerId
      ? { OR: [{ resellerId: req.user.resellerId }, { customer: { resellerId: req.user.resellerId } }] }
      : {};
    const list = await prisma.serviceInvoice.findMany({
      where,
      include: { customer: { include: { user: { select: { name: true, phone: true } } } }, reseller: { select: { companyName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/service-invoices', [
  body('customerId').optional().trim(),
  body('description').trim().notEmpty(),
  body('amount').isFloat({ min: 0.01 }),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    if (req.body.customerId && req.user?.role === 'RESELLER' && req.user?.resellerId) {
      const cust = await prisma.customerProfile.findUnique({ where: { id: req.body.customerId } });
      if (!cust || cust.resellerId !== req.user.resellerId) throw new AppError(403, 'Customer not under your reseller');
    }
    const invNum = await nextServiceInvoiceNumber();
    const inv = await prisma.serviceInvoice.create({
      data: {
        invoiceNumber: invNum,
        customerId: req.body.customerId || null,
        resellerId: req.user?.role === 'RESELLER' ? req.user.resellerId ?? null : null,
        description: req.body.description.trim(),
        amount: req.body.amount,
        date: new Date(),
        status: 'PAID',
      },
      include: { customer: { include: { user: true } }, reseller: true },
    });
    res.status(201).json(inv);
  } catch (e) {
    next(e);
  }
});

router.get('/service-invoices/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const inv = await prisma.serviceInvoice.findUnique({
      where: { id: req.params.id },
      include: { customer: { include: { user: true, reseller: true } } },
    });
    if (!inv) throw new AppError(404, 'Invoice not found');
    if (req.user?.role === 'RESELLER' && req.user?.resellerId) {
      const ok = inv.resellerId === req.user.resellerId || inv.customer?.resellerId === req.user.resellerId;
      if (!ok) throw new AppError(403, 'Forbidden');
    }
    res.json(inv);
  } catch (e) {
    next(e);
  }
});

export { router as salesRouter };
