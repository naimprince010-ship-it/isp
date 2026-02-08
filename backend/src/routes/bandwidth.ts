import { Router, type Response, type NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, requireAdmin, type AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(authMiddleware);
router.use(requireAdmin);

async function nextBillNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const pattern = `BWB-${year}-`;
  const last = await prisma.bandwidthBill.findFirst({
    where: { billNumber: { startsWith: pattern } },
    orderBy: { billNumber: 'desc' },
  });
  const num = last ? parseInt(last.billNumber.split('-').pop() || '0', 10) + 1 : 1;
  return `${pattern}${String(num).padStart(4, '0')}`;
}

// Bandwidth Items
router.get('/items', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const list = await prisma.bandwidthItem.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.get('/items/all', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const list = await prisma.bandwidthItem.findMany({ orderBy: { name: 'asc' } });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/items', [
  body('name').trim().notEmpty(),
  body('capacityMbps').optional().isInt({ min: 0 }),
  body('unit').optional().trim(),
  body('description').optional().trim(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const item = await prisma.bandwidthItem.create({
      data: {
        name: req.body.name.trim(),
        capacityMbps: req.body.capacityMbps ?? null,
        unit: req.body.unit?.trim() || 'Mbps',
        description: req.body.description?.trim() || null,
      },
    });
    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
});

router.patch('/items/:id', [
  body('name').optional().trim().notEmpty(),
  body('capacityMbps').optional().isInt({ min: 0 }),
  body('unit').optional().trim(),
  body('description').optional().trim(),
  body('isActive').optional().isBoolean(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const data: Record<string, unknown> = {};
    if (req.body.name !== undefined) data.name = req.body.name.trim();
    if (req.body.capacityMbps !== undefined) data.capacityMbps = req.body.capacityMbps;
    if (req.body.unit !== undefined) data.unit = req.body.unit?.trim() || 'Mbps';
    if (req.body.description !== undefined) data.description = req.body.description?.trim() || null;
    if (req.body.isActive !== undefined) data.isActive = req.body.isActive;
    const item = await prisma.bandwidthItem.update({ where: { id: req.params.id }, data });
    res.json(item);
  } catch (e) {
    next(e);
  }
});

// Bandwidth Providers
router.get('/providers', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const list = await prisma.bandwidthProvider.findMany({
      where: { isActive: true },
      include: { _count: { select: { bills: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.get('/providers/all', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const list = await prisma.bandwidthProvider.findMany({
      include: { _count: { select: { bills: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

// Provider list with ledger amount (total bills - total payments per provider)
router.get('/providers/ledger', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const providers = await prisma.bandwidthProvider.findMany({
      where: { isActive: true },
      include: {
        bills: {
          include: {
            payments: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    const withLedger = providers.map((p) => {
      const totalBills = p.bills.reduce((s, b) => s + Number(b.amount), 0);
      const totalPaid = p.bills.reduce((s, b) => s + b.payments.reduce((sp, pay) => sp + Number(pay.amount), 0), 0);
      const ledgerAmount = totalBills - totalPaid;
      return {
        ...p,
        totalBills,
        totalPaid,
        ledgerAmount,
      };
    });
    res.json(withLedger);
  } catch (e) {
    next(e);
  }
});

router.post('/providers', [
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
    const provider = await prisma.bandwidthProvider.create({
      data: {
        name: req.body.name.trim(),
        contactPerson: req.body.contactPerson?.trim() || null,
        phone: req.body.phone?.trim() || null,
        email: req.body.email?.trim() || null,
        address: req.body.address?.trim() || null,
        notes: req.body.notes?.trim() || null,
      },
    });
    res.status(201).json(provider);
  } catch (e) {
    next(e);
  }
});

router.patch('/providers/:id', [
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
    const provider = await prisma.bandwidthProvider.update({ where: { id: req.params.id }, data });
    res.json(provider);
  } catch (e) {
    next(e);
  }
});

// Bandwidth Bills
router.get('/bills', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const status = req.query.status as string | undefined;
    const providerId = req.query.providerId as string | undefined;

    const where: Prisma.BandwidthBillWhereInput = {};
    if (month != null && year != null) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      where.date = { gte: start, lte: end };
    }
    if (status) where.status = status;
    if (providerId) where.providerId = providerId;

    const list = await prisma.bandwidthBill.findMany({
      where,
      include: { provider: true, payments: true },
      orderBy: { date: 'desc' },
      take: 200,
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/bills', [
  body('providerId').trim().notEmpty(),
  body('date').notEmpty(),
  body('amount').isFloat({ min: 0.01 }),
  body('periodStart').optional(),
  body('periodEnd').optional(),
  body('dueDate').optional(),
  body('items').optional().isArray(),
  body('notes').optional().trim(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const billNum = await nextBillNumber();
    const bill = await prisma.bandwidthBill.create({
      data: {
        billNumber: billNum,
        providerId: req.body.providerId,
        date: new Date(req.body.date),
        periodStart: req.body.periodStart ? new Date(req.body.periodStart) : null,
        periodEnd: req.body.periodEnd ? new Date(req.body.periodEnd) : null,
        amount: new Prisma.Decimal(req.body.amount),
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
        items: req.body.items ?? null,
        notes: req.body.notes?.trim() || null,
      },
      include: { provider: true },
    });
    res.status(201).json(bill);
  } catch (e) {
    next(e);
  }
});

router.get('/bills/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const bill = await prisma.bandwidthBill.findUnique({
      where: { id: req.params.id },
      include: { provider: true, payments: true },
    });
    if (!bill) throw new AppError(404, 'Bill not found');
    res.json(bill);
  } catch (e) {
    next(e);
  }
});

// Bandwidth Bill Payment
router.post('/bills/:id/payments', [
  body('amount').isFloat({ min: 0.01 }),
  body('paymentDate').notEmpty(),
  body('method').isIn(['CASH', 'BKASH', 'NAGAD', 'ROCKET', 'BANK']),
  body('trxId').optional().trim(),
  body('notes').optional().trim(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const billId = req.params.id;
    const bill = await prisma.bandwidthBill.findUnique({
      where: { id: billId },
      include: { payments: true },
    });
    if (!bill) throw new AppError(404, 'Bill not found');
    const amount = new Prisma.Decimal(req.body.amount);
    const totalPaid = bill.payments.reduce((s, p) => s + Number(p.amount), 0);
    const newTotal = totalPaid + Number(amount);
    const status = newTotal >= Number(bill.amount) ? 'PAID' : 'PARTIAL';

    const [payment] = await prisma.$transaction([
      prisma.bandwidthPayment.create({
        data: {
          billId,
          amount,
          paymentDate: new Date(req.body.paymentDate),
          method: req.body.method,
          trxId: req.body.trxId?.trim() || null,
          notes: req.body.notes?.trim() || null,
        },
      }),
      prisma.bandwidthBill.update({
        where: { id: billId },
        data: { status },
      }),
    ]);
    const updated = await prisma.bandwidthBill.findUnique({
      where: { id: billId },
      include: { provider: true, payments: true },
    });
    res.status(201).json({ payment, bill: updated });
  } catch (e) {
    next(e);
  }
});

// Month-wise bill & payment history
router.get('/history', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const month = req.query.month ? parseInt(req.query.month as string, 10) : new Date().getMonth() + 1;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const [bills, payments] = await Promise.all([
      prisma.bandwidthBill.findMany({
        where: { date: { gte: start, lte: end } },
        include: { provider: true, payments: true },
        orderBy: { date: 'desc' },
      }),
      prisma.bandwidthPayment.findMany({
        where: { paymentDate: { gte: start, lte: end } },
        include: { bill: { include: { provider: true } } },
        orderBy: { paymentDate: 'desc' },
      }),
    ]);

    const totalBills = bills.reduce((s, b) => s + Number(b.amount), 0);
    const totalPayments = payments.reduce((s, p) => s + Number(p.amount), 0);

    res.json({
      month,
      year,
      bills,
      payments,
      totalBills,
      totalPayments,
      summary: { totalBills, totalPayments, balance: totalBills - totalPayments },
    });
  } catch (e) {
    next(e);
  }
});

export { router as bandwidthRouter };
