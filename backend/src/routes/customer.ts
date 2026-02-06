import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, requireCustomer, type AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(authMiddleware);
router.use(requireCustomer);

router.get('/dashboard', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const profile = await prisma.customerProfile.findFirst({
      where: { userId },
      include: {
        package: true,
        reseller: { include: { user: { select: { name: true, phone: true } } } },
      },
    });
    if (!profile) throw new AppError(404, 'Customer profile not found');
    const pendingBills = await prisma.bill.findMany({
      where: { customerId: profile.id, status: 'PENDING' },
      include: { package: true },
      orderBy: { dueDate: 'asc' },
    });
    const lastPayment = await prisma.payment.findFirst({
      where: { customerId: userId },
      orderBy: { createdAt: 'desc' },
      include: { bill: true },
    });
    res.json({
      profile: {
        id: profile.id,
        status: profile.status,
        connectionType: profile.connectionType,
        username: profile.username,
        staticIp: profile.staticIp,
        address: profile.address,
        package: profile.package,
        reseller: profile.reseller?.user?.name,
      },
      pendingBills,
      lastPayment: lastPayment ? { amount: lastPayment.amount, method: lastPayment.method, createdAt: lastPayment.createdAt, bill: lastPayment.bill } : null,
    });
  } catch (e) {
    next(e);
  }
});

router.get('/bills', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const profile = await prisma.customerProfile.findFirst({ where: { userId }, select: { id: true } });
    if (!profile) throw new AppError(404, 'Profile not found');
    const bills = await prisma.bill.findMany({
      where: { customerId: profile.id },
      include: { package: true, payments: true },
      orderBy: { dueDate: 'desc' },
      take: 50,
    });
    res.json(bills);
  } catch (e) {
    next(e);
  }
});

// Single bill invoice (customer: own bills only)
router.get('/bills/:id/invoice', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const profile = await prisma.customerProfile.findFirst({ where: { userId }, select: { id: true } });
    if (!profile) throw new AppError(404, 'Profile not found');
    const bill = await prisma.bill.findFirst({
      where: { id: req.params.id, customerId: profile.id },
      include: {
        customer: { include: { user: true, reseller: { include: { companyName: true, receiptHeader: true, receiptFooter: true } }, package: true } },
        package: true,
        payments: true,
      },
    });
    if (!bill) throw new AppError(404, 'Bill not found');
    const discount = Number((bill as any).discountAmount ?? 0);
    const total = Number(bill.amount) - discount;
    const paid = bill.payments.reduce((s, p) => s + Number(p.amount), 0);
    const due = Math.max(0, total - paid);
    const resellerProfile = bill.customer?.reseller as any;
    const header = resellerProfile?.receiptHeader ?? resellerProfile?.companyName ?? 'ISP';
    const footer = resellerProfile?.receiptFooter ?? 'Thank you';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${bill.id}</title><style>body{font-family:sans-serif;max-width:400px;margin:1em}table{width:100%;border-collapse:collapse}th,td{border:1px solid #333;padding:6px}.r{text-align:right}</style></head><body>
<div><strong>${String(header).replace(/</g, '&lt;')}</strong></div><hr>
<h2>Invoice</h2>
<div>Bill #${bill.id.slice(-8)}</div>
<div>Date: ${new Date(bill.createdAt).toLocaleDateString()}</div>
<div>Customer: ${(bill.customer?.user?.name ?? '').replace(/</g, '&lt;')}</div>
<div>Phone: ${(bill.customer?.user?.phone ?? '').replace(/</g, '&lt;')}</div>
<div>Package: ${(bill.package?.name ?? '').replace(/</g, '&lt;')}</div>
<table><tr><td>Amount</td><td class="r">BDT ${bill.amount}</td></tr>
${discount ? `<tr><td>Discount</td><td class="r">- BDT ${discount}</td></tr>` : ''}
<tr><td>Total</td><td class="r">BDT ${total}</td></tr>
<tr><td>Paid</td><td class="r">BDT ${paid}</td></tr>
<tr><td><strong>Due</strong></td><td class="r"><strong>BDT ${due}</strong></td></tr></table>
<div>Due Date: ${new Date(bill.dueDate).toLocaleDateString()}</div><hr>
<div>${String(footer).replace(/</g, '&lt;')}</div>
</body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) {
    next(e);
  }
});

router.post('/bills/:billId/pay', [body('amount').isFloat({ min: 0.01 }), body('method').isIn(['BKASH', 'NAGAD', 'ROCKET']), body('trxId').trim().notEmpty()], async (req: AuthRequest, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const userId = req.user!.id;
    const profile = await prisma.customerProfile.findFirst({ where: { userId }, select: { id: true } });
    if (!profile) throw new AppError(404, 'Profile not found');
    const bill = await prisma.bill.findFirst({ where: { id: req.params.billId, customerId: profile.id }, include: { customer: true, package: true } });
    if (!bill) throw new AppError(404, 'Bill not found');
    const amount = new Prisma.Decimal(req.body.amount);
    const paid = await prisma.payment.aggregate({ where: { billId: bill.id }, _sum: { amount: true } });
    const totalPaid = Prisma.Decimal.add(paid._sum.amount ?? 0, amount);
    const newStatus = totalPaid.gte(bill.amount) ? 'PAID' : 'PARTIAL';
    await prisma.$transaction([
      prisma.payment.create({ data: { billId: bill.id, customerId: userId, amount, method: req.body.method, trxId: req.body.trxId } }),
      prisma.bill.update({ where: { id: bill.id }, data: { status: newStatus, ...(newStatus === 'PAID' && { paidAt: new Date() }) } }),
      ...(newStatus === 'PAID' ? [prisma.customerProfile.update({ where: { id: profile.id }, data: { status: 'ACTIVE' } })] : []),
    ]);
    const updated = await prisma.bill.findUnique({ where: { id: bill.id }, include: { payments: true } });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

router.get('/usage', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const profile = await prisma.customerProfile.findFirst({ where: { userId }, select: { id: true } });
    if (!profile) throw new AppError(404, 'Profile not found');
    const days = Math.min(parseInt(req.query.days as string) || 30, 90);
    const start = new Date();
    start.setDate(start.getDate() - days);
    const logs = await prisma.usageLog.findMany({ where: { customerId: profile.id, date: { gte: start } }, orderBy: { date: 'asc' } });
    res.json(logs.map((l) => ({ date: l.date, downloadBytes: l.downloadBytes.toString(), uploadBytes: l.uploadBytes.toString(), totalBytes: Number(l.downloadBytes) + Number(l.uploadBytes) })));
  } catch (e) {
    next(e);
  }
});

// Package/status change request from client portal
router.get('/requests', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const profile = await prisma.customerProfile.findFirst({ where: { userId }, select: { id: true } });
    if (!profile) throw new AppError(404, 'Profile not found');
    const list = await prisma.customerRequest.findMany({
      where: { customerId: profile.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/requests', [
  body('type').isIn(['PACKAGE_CHANGE', 'STATUS_CHANGE']),
  body('requestedPackageId').optional().isString(),
  body('requestedStatus').optional().isIn(['ACTIVE', 'INACTIVE', 'BLOCKED', 'PENDING', 'PERSONAL', 'FREE', 'LEFT']),
], async (req: AuthRequest, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const userId = req.user!.id;
    const profile = await prisma.customerProfile.findFirst({ where: { userId }, select: { id: true } });
    if (!profile) throw new AppError(404, 'Profile not found');
    const { type, requestedPackageId, requestedStatus } = req.body;
    if (type === 'PACKAGE_CHANGE' && !requestedPackageId) throw new AppError(400, 'requestedPackageId required for package change');
    if (type === 'STATUS_CHANGE' && !requestedStatus) throw new AppError(400, 'requestedStatus required for status change');
    const created = await prisma.customerRequest.create({
      data: {
        customerId: profile.id,
        type,
        requestedPackageId: requestedPackageId || null,
        requestedStatus: requestedStatus || null,
        status: 'PENDING',
      },
    });
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
});

export { router as customerRouter };
