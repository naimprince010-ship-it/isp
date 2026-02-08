import { Router, type Response, type NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, requireAdmin, type AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { sendEmail } from '../services/email.js';
import { sendSms } from '../services/sms.js';

const router = Router();
router.use(authMiddleware);
router.use(requireAdmin);

async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const pattern = `BWS-${year}-`;
  const last = await prisma.bandwidthSellInvoice.findFirst({
    where: { invoiceNumber: { startsWith: pattern } },
    orderBy: { invoiceNumber: 'desc' },
  });
  const num = last ? parseInt(last.invoiceNumber.split('-').pop() || '0', 10) + 1 : 1;
  return `${pattern}${String(num).padStart(4, '0')}`;
}

// Bandwidth Resellers
router.get('/resellers', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const list = await prisma.bandwidthReseller.findMany({
      where: { isActive: true },
      include: { resellerProfile: { include: { user: { select: { email: true, phone: true } } } } },
      orderBy: { name: 'asc' },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.get('/resellers/all', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const list = await prisma.bandwidthReseller.findMany({
      include: { resellerProfile: { include: { user: { select: { email: true, phone: true } } } } },
      orderBy: { name: 'asc' },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

// Reseller list with ledger amount
router.get('/resellers/ledger', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const resellers = await prisma.bandwidthReseller.findMany({
      where: { isActive: true },
      include: {
        invoices: { include: { payments: true } },
        resellerProfile: { include: { user: { select: { email: true, phone: true } } } },
      },
      orderBy: { name: 'asc' },
    });
    const withLedger = resellers.map((r) => {
      const totalInvoices = r.invoices.reduce((s, i) => s + Number(i.amount), 0);
      const totalPaid = r.invoices.reduce((s, i) => s + i.payments.reduce((sp, p) => sp + Number(p.amount), 0), 0);
      return {
        ...r,
        totalInvoices,
        totalPaid,
        ledgerAmount: totalInvoices - totalPaid,
      };
    });
    res.json(withLedger);
  } catch (e) {
    next(e);
  }
});

router.post('/resellers', [
  body('name').trim().notEmpty(),
  body('email').optional().trim(),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('resellerProfileId').optional().trim(),
  body('notes').optional().trim(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const existing = req.body.resellerProfileId
      ? await prisma.bandwidthReseller.findUnique({ where: { resellerProfileId: req.body.resellerProfileId } })
      : null;
    if (existing) throw new AppError(400, 'This reseller is already a bandwidth reseller');
    const reseller = await prisma.bandwidthReseller.create({
      data: {
        name: req.body.name.trim(),
        email: req.body.email?.trim() || null,
        phone: req.body.phone?.trim() || null,
        address: req.body.address?.trim() || null,
        resellerProfileId: req.body.resellerProfileId?.trim() || null,
        notes: req.body.notes?.trim() || null,
      },
      include: { resellerProfile: true },
    });
    res.status(201).json(reseller);
  } catch (e) {
    next(e);
  }
});

router.patch('/resellers/:id', [
  body('name').optional().trim().notEmpty(),
  body('email').optional().trim(),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('notes').optional().trim(),
  body('isActive').optional().isBoolean(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const data: Record<string, unknown> = {};
    if (req.body.name !== undefined) data.name = req.body.name.trim();
    if (req.body.email !== undefined) data.email = req.body.email?.trim() || null;
    if (req.body.phone !== undefined) data.phone = req.body.phone?.trim() || null;
    if (req.body.address !== undefined) data.address = req.body.address?.trim() || null;
    if (req.body.notes !== undefined) data.notes = req.body.notes?.trim() || null;
    if (req.body.isActive !== undefined) data.isActive = req.body.isActive;
    const reseller = await prisma.bandwidthReseller.update({ where: { id: req.params.id }, data });
    res.json(reseller);
  } catch (e) {
    next(e);
  }
});

// Bandwidth Sell Invoices
router.get('/invoices', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const status = req.query.status as string | undefined;
    const resellerId = req.query.resellerId as string | undefined;

    const where: Prisma.BandwidthSellInvoiceWhereInput = {};
    if (month != null && year != null) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      where.date = { gte: start, lte: end };
    }
    if (status) where.status = status;
    if (resellerId) where.bandwidthResellerId = resellerId;

    const list = await prisma.bandwidthSellInvoice.findMany({
      where,
      include: { bandwidthReseller: true, payments: true },
      orderBy: { date: 'desc' },
      take: 200,
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/invoices', [
  body('bandwidthResellerId').trim().notEmpty(),
  body('date').notEmpty(),
  body('amount').isFloat({ min: 0.01 }),
  body('periodStart').optional(),
  body('periodEnd').optional(),
  body('dueDate').optional(),
  body('description').optional().trim(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const invNum = await nextInvoiceNumber();
    const inv = await prisma.bandwidthSellInvoice.create({
      data: {
        invoiceNumber: invNum,
        bandwidthResellerId: req.body.bandwidthResellerId,
        date: new Date(req.body.date),
        periodStart: req.body.periodStart ? new Date(req.body.periodStart) : null,
        periodEnd: req.body.periodEnd ? new Date(req.body.periodEnd) : null,
        amount: new Prisma.Decimal(req.body.amount),
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
        description: req.body.description?.trim() || null,
      },
      include: { bandwidthReseller: true },
    });
    res.status(201).json(inv);
  } catch (e) {
    next(e);
  }
});

router.get('/invoices/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const inv = await prisma.bandwidthSellInvoice.findUnique({
      where: { id: req.params.id },
      include: { bandwidthReseller: true, payments: true },
    });
    if (!inv) throw new AppError(404, 'Invoice not found');
    res.json(inv);
  } catch (e) {
    next(e);
  }
});

// Send invoice to reseller by email
router.post('/invoices/:id/send-email', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const inv = await prisma.bandwidthSellInvoice.findUnique({
      where: { id: req.params.id },
      include: { bandwidthReseller: true, payments: true },
    });
    if (!inv) throw new AppError(404, 'Invoice not found');
    const email = inv.bandwidthReseller.email || (inv.bandwidthReseller.resellerProfile as any)?.user?.email;
    if (!email) throw new AppError(400, 'Reseller has no email');
    const totalPaid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
    const due = Number(inv.amount) - totalPaid;
    const html = `
      <h2>Bandwidth Invoice</h2>
      <p>Invoice: ${inv.invoiceNumber}</p>
      <p>Date: ${new Date(inv.date).toLocaleDateString()}</p>
      <p>Reseller: ${inv.bandwidthReseller.name}</p>
      <p>Amount: ৳${Number(inv.amount).toFixed(2)}</p>
      <p>Paid: ৳${totalPaid.toFixed(2)}</p>
      <p>Due: ৳${due.toFixed(2)}</p>
      ${inv.dueDate ? `<p>Due Date: ${new Date(inv.dueDate).toLocaleDateString()}</p>` : ''}
    `;
    const result = await sendEmail(email, `Invoice ${inv.invoiceNumber} - Bandwidth`, html);
    if (!result.success) throw new AppError(500, result.error || 'Email failed');
    await prisma.bandwidthSellInvoice.update({
      where: { id: inv.id },
      data: { sentEmailAt: new Date() },
    });
    res.json({ ok: true, message: 'Invoice sent by email' });
  } catch (e) {
    next(e);
  }
});

// Send invoice info to reseller by SMS
router.post('/invoices/:id/send-sms', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const inv = await prisma.bandwidthSellInvoice.findUnique({
      where: { id: req.params.id },
      include: { bandwidthReseller: true, payments: true },
    });
    if (!inv) throw new AppError(404, 'Invoice not found');
    const phone = inv.bandwidthReseller.phone || (inv.bandwidthReseller.resellerProfile as any)?.user?.phone;
    if (!phone) throw new AppError(400, 'Reseller has no phone');
    const totalPaid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
    const due = Number(inv.amount) - totalPaid;
    const msg = `Invoice ${inv.invoiceNumber}: Amount ৳${Number(inv.amount).toFixed(2)}, Due ৳${due.toFixed(2)}. Pay before ${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A'}.`;
    const result = await sendSms(phone, msg, 'BANDWIDTH_INVOICE');
    if (!result.success) throw new AppError(500, 'SMS failed');
    await prisma.bandwidthSellInvoice.update({
      where: { id: inv.id },
      data: { sentSmsAt: new Date() },
    });
    res.json({ ok: true, message: 'Invoice info sent by SMS' });
  } catch (e) {
    next(e);
  }
});

// Receive reseller payment
router.post('/invoices/:id/payments', [
  body('amount').isFloat({ min: 0.01 }),
  body('paymentDate').notEmpty(),
  body('method').isIn(['CASH', 'BKASH', 'NAGAD', 'ROCKET', 'BANK']),
  body('trxId').optional().trim(),
  body('notes').optional().trim(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const invoiceId = req.params.id;
    const inv = await prisma.bandwidthSellInvoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });
    if (!inv) throw new AppError(404, 'Invoice not found');
    const amount = new Prisma.Decimal(req.body.amount);
    const totalPaid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
    const newTotal = totalPaid + Number(amount);
    const status = newTotal >= Number(inv.amount) ? 'PAID' : 'PARTIAL';

    await prisma.$transaction([
      prisma.bandwidthResellerPayment.create({
        data: {
          invoiceId,
          amount,
          paymentDate: new Date(req.body.paymentDate),
          method: req.body.method,
          trxId: req.body.trxId?.trim() || null,
          notes: req.body.notes?.trim() || null,
        },
      }),
      prisma.bandwidthSellInvoice.update({
        where: { id: invoiceId },
        data: { status },
      }),
    ]);
    const updated = await prisma.bandwidthSellInvoice.findUnique({
      where: { id: invoiceId },
      include: { bandwidthReseller: true, payments: true },
    });
    res.status(201).json(updated);
  } catch (e) {
    next(e);
  }
});

export { router as bandwidthSalesRouter };
