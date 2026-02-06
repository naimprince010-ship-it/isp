import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, requireAdmin, requireRole, type AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const router = Router();
router.use(authMiddleware);

// Employee or Admin: submit bill collection (employee -> pending approval, admin -> direct payment)
router.post('/bills/:billId/collect-employee', requireRole('ADMIN', 'EMPLOYEE'), [
  body('amount').isFloat({ min: 0.01 }),
  body('method').isIn(['CASH', 'BKASH', 'NAGAD', 'ROCKET']),
  body('trxId').optional().trim(),
  body('notes').optional().trim(),
], async (req: AuthRequest, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const billId = req.params.billId;
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: { customer: { include: { user: true } }, package: true },
    });
    if (!bill) throw new AppError(404, 'Bill not found');
    if (bill.status === 'PAID') throw new AppError(400, 'Bill already paid');
    const isEmployee = req.user!.role === 'EMPLOYEE';
    if (isEmployee) {
      const pending = await prisma.pendingPaymentApproval.create({
        data: {
          billId,
          amount: req.body.amount,
          method: req.body.method,
          trxId: req.body.trxId || null,
          collectedBy: req.user!.id,
          status: 'PENDING',
          notes: req.body.notes || null,
        },
        include: { bill: { include: { customer: { include: { user: true } }, package: true } } },
      });
      return res.status(201).json({ pending: true, id: pending.id, message: 'Collection submitted for admin approval.' });
    }
    const amount = new Prisma.Decimal(req.body.amount);
    const paid = await prisma.payment.aggregate({ where: { billId }, _sum: { amount: true } });
    const totalPaid = Prisma.Decimal.add(paid._sum.amount ?? 0, amount);
    const newStatus = totalPaid.gte(bill.amount) ? 'PAID' : 'PARTIAL';
    await prisma.$transaction([
      prisma.payment.create({
        data: {
          billId,
          customerId: bill.customer.userId,
          amount,
          method: req.body.method as any,
          trxId: req.body.trxId || null,
          collectedBy: req.user!.id,
          approvedBy: req.user!.id,
        },
      }),
      prisma.bill.update({
        where: { id: billId },
        data: { status: newStatus, ...(newStatus === 'PAID' && { paidAt: new Date() }) },
      }),
      ...(newStatus === 'PAID' ? [prisma.customerProfile.update({ where: { id: bill.customerId }, data: { status: 'ACTIVE' } })] : []),
    ] as any);
    const updated = await prisma.bill.findUnique({ where: { id: billId }, include: { payments: true } });
    res.status(201).json(updated);
  } catch (e) {
    next(e);
  }
});

// Admin only: list and approve pending payment (employee collections)
router.get('/pending-payment-approvals', requireAdmin, async (req, res, next) => {
  try {
    const status = req.query.status as string | undefined;
    const where: Prisma.PendingPaymentApprovalWhereInput = {};
    if (status) where.status = status;
    const list = await prisma.pendingPaymentApproval.findMany({
      where,
      include: {
        bill: {
          include: {
            customer: { include: { user: true } },
            package: true,
            payments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.patch('/pending-payment-approvals/:id', requireAdmin, [
  body('status').isIn(['APPROVED', 'REJECTED']),
  body('notes').optional().trim(),
], async (req: AuthRequest, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const id = req.params.id;
    const { status, notes } = req.body;
    const pending = await prisma.pendingPaymentApproval.findUnique({
      where: { id },
      include: { bill: { include: { customer: true } } },
    });
    if (!pending) throw new AppError(404, 'Not found');
    if (pending.status !== 'PENDING') throw new AppError(400, 'Already processed');
    if (status === 'REJECTED') {
      await prisma.pendingPaymentApproval.update({
        where: { id },
        data: { status: 'REJECTED', approvedBy: req.user!.id, approvedAt: new Date(), notes: notes || null },
      });
      return res.json({ ok: true, message: 'Rejected' });
    }
    const amount = pending.amount;
    const bill = pending.bill;
    const paid = await prisma.payment.aggregate({ where: { billId: bill.id }, _sum: { amount: true } });
    const totalPaid = Prisma.Decimal.add(paid._sum.amount ?? 0, amount);
    const newStatus = totalPaid.gte(bill.amount) ? 'PAID' : 'PARTIAL';
    await prisma.$transaction([
      prisma.payment.create({
        data: {
          billId: bill.id,
          customerId: bill.customer.userId,
          amount,
          method: pending.method as any,
          trxId: pending.trxId,
          collectedBy: pending.collectedBy,
          approvedBy: req.user!.id,
        },
      }),
      prisma.bill.update({
        where: { id: bill.id },
        data: { status: newStatus, ...(newStatus === 'PAID' && { paidAt: new Date() }) },
      }),
      prisma.pendingPaymentApproval.update({
        where: { id },
        data: { status: 'APPROVED', approvedBy: req.user!.id, approvedAt: new Date(), notes: notes || null },
      }),
      ...(newStatus === 'PAID' ? [prisma.customerProfile.update({ where: { id: bill.customerId }, data: { status: 'ACTIVE' } })] : []),
    ] as any);
    res.json({ ok: true, message: 'Approved and payment applied.' });
  } catch (e) {
    next(e);
  }
});

router.use(requireAdmin);

// Setup status: what's configured (for Admin Dashboard)
router.get('/setup-status', async (_req, res, next) => {
  try {
    let db = false;
    try {
      await prisma.user.count();
      db = true;
    } catch {
      db = false;
    }
    const mikrotikConfigured = !!(process.env.MIKROTIK_HOST && process.env.MIKROTIK_USER && process.env.MIKROTIK_PASSWORD);
    const smsConfigured = !!(process.env.SMS_API_URL && process.env.SMS_API_KEY);
    res.json({ db, mikrotikConfigured, smsConfigured });
  } catch (e) {
    next(e);
  }
});

router.get('/dashboard', async (_req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const [totalCustomers, activeCustomers, inactiveCustomers, monthlyPayments, resellerCount] =
      await Promise.all([
        prisma.customerProfile.count(),
        prisma.customerProfile.count({ where: { status: 'ACTIVE' } }),
        prisma.customerProfile.count({ where: { status: { in: ['INACTIVE', 'BLOCKED'] } } }),
        prisma.payment.aggregate({
          where: { createdAt: { gte: startOfMonth, lte: endOfMonth } },
          _sum: { amount: true },
        }),
        prisma.resellerProfile.count(),
      ]);
    const pendingBills = await prisma.bill.aggregate({
      where: { status: 'PENDING' },
      _sum: { amount: true },
    });
    res.json({
      totalCustomers,
      activeCustomers,
      inactiveCustomers,
      monthlyCollection: Number(monthlyPayments._sum.amount ?? 0),
      pendingBillsAmount: Number(pendingBills._sum.amount ?? 0),
      resellerCount,
      period: { start: startOfMonth, end: endOfMonth },
    });
  } catch (e) {
    next(e);
  }
});

// Upstream / BTCL config (capacity, provider) – record only; no API to BTCL
router.get('/upstream', async (_req, res, next) => {
  try {
    const configs = await prisma.systemConfig.findMany({
      where: { key: { in: ['upstream_provider', 'upstream_capacity_mbps', 'upstream_notes'] } },
    });
    const byKey = Object.fromEntries(configs.map((c) => [c.key, c.value]));
    const capacityMbps = parseInt(byKey.upstream_capacity_mbps || '0', 10) || 0;
    const activeCustomers = await prisma.customerProfile.findMany({
      where: { status: 'ACTIVE' },
      include: { package: true },
    });
    const soldMbps = activeCustomers.reduce((sum, c) => sum + (c.package?.speedMbps || 0), 0);
    res.json({
      provider: byKey.upstream_provider || 'Summit Communications',
      capacityMbps,
      notes: byKey.upstream_notes || '',
      soldMbps,
    });
  } catch (e) {
    next(e);
  }
});

router.patch('/upstream', [
  body('provider').optional().trim(),
  body('capacityMbps').optional().isInt({ min: 0 }).toInt(),
  body('notes').optional().trim(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const { provider, capacityMbps, notes } = req.body;
    const upsert = async (key: string, value: string) => {
      await prisma.systemConfig.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
    };
    if (provider != null) await upsert('upstream_provider', String(provider));
    if (capacityMbps != null) await upsert('upstream_capacity_mbps', String(capacityMbps));
    if (notes != null) await upsert('upstream_notes', String(notes));
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get('/resellers', async (_req, res, next) => {
  try {
    const list = await prisma.user.findMany({
      where: { role: 'RESELLER' },
      include: { resellerProfile: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post(
  '/resellers',
  [
    body('phone').trim().notEmpty(),
    body('password').isLength({ min: 6 }),
    body('name').trim().notEmpty(),
    body('email').optional().isEmail(),
    body('balanceLimit').optional().isFloat({ min: 0 }).toFloat(),
    body('commissionRate').optional().isFloat({ min: 0, max: 100 }).toFloat(),
    body('area').optional().trim(),
    body('companyName').optional().trim(),
    body('address').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
      const existing = await prisma.user.findUnique({ where: { phone: req.body.phone } });
      if (existing) throw new AppError(400, 'Phone already registered');
      const passwordHash = await bcrypt.hash(req.body.password, 10);
      const user = await prisma.user.create({
        data: {
          phone: req.body.phone,
          email: req.body.email || null,
          passwordHash,
          name: req.body.name,
          role: 'RESELLER',
          resellerProfile: {
            create: {
              balanceLimit: req.body.balanceLimit ?? 0,
              currentBalance: 0,
              commissionRate: req.body.commissionRate ?? 0,
              area: req.body.area || null,
              companyName: req.body.companyName || null,
              address: req.body.address || null,
            },
          },
        },
        include: { resellerProfile: true },
      });
      res.status(201).json(user);
    } catch (e) {
      next(e);
    }
  }
);

router.patch('/resellers/:id', async (req, res, next) => {
  try {
    const userId = req.params.id;
    const user = await prisma.user.findFirst({
      where: { id: userId, role: 'RESELLER' },
      include: { resellerProfile: true },
    });
    if (!user?.resellerProfile) throw new AppError(404, 'Reseller not found');
    const { balanceLimit, commissionRate, area, companyName, address, logoUrl, receiptHeader, receiptFooter, isActive } = req.body;
    if (isActive !== undefined) {
      await prisma.user.update({ where: { id: userId }, data: { isActive } });
    }
    await prisma.resellerProfile.update({
      where: { id: user.resellerProfile.id },
      data: {
        ...(balanceLimit != null && { balanceLimit }),
        ...(commissionRate != null && { commissionRate }),
        ...(area != null && { area }),
        ...(companyName != null && { companyName }),
        ...(address != null && { address }),
        ...(logoUrl != null && { logoUrl }),
        ...(receiptHeader != null && { receiptHeader }),
        ...(receiptFooter != null && { receiptFooter }),
      },
    });
    const updated = await prisma.user.findUnique({
      where: { id: userId },
      include: { resellerProfile: true },
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

router.post(
  '/resellers/:id/recharge',
  [body('amount').isFloat({ min: 0.01 }), body('notes').optional().trim()],
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
      const userId = req.params.id;
      const resellerUser = await prisma.user.findFirst({
        where: { id: userId, role: 'RESELLER' },
        include: { resellerProfile: true },
      });
      if (!resellerUser?.resellerProfile) throw new AppError(404, 'Reseller not found');
      const amount = new Prisma.Decimal(req.body.amount);
      const prev = resellerUser.resellerProfile.currentBalance;
      const newBal = Prisma.Decimal.add(prev, amount);
      await prisma.resellerProfile.update({
        where: { id: resellerUser.resellerProfile.id },
        data: { currentBalance: newBal },
      });
      await prisma.resellerRecharge.create({
        data: {
          resellerId: resellerUser.resellerProfile.id,
          amount,
          previousBalance: prev,
          newBalance: newBal,
          approvedBy: req.user!.id,
          notes: req.body.notes || null,
        },
      });
      const updated = await prisma.resellerProfile.findUnique({
        where: { id: resellerUser.resellerProfile.id },
      });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  }
);

async function getBtrcReportData(month: number, year: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  const [customers, payments] = await Promise.all([
    prisma.customerProfile.findMany({
      where: { createdAt: { lte: end } },
      include: {
        user: { select: { name: true, phone: true, email: true } },
        package: true,
        reseller: { include: { user: { select: { name: true, phone: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.payment.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: {
        bill: { include: { customer: { include: { user: { select: { name: true, phone: true } } } } } },
        customer: { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);
  const userList = customers.map((c) => ({
    id: c.id,
    name: c.user.name,
    phone: c.user.phone,
    email: c.user.email,
    package: c.package.name,
    speedMbps: c.package.speedMbps,
    connectionType: c.connectionType,
    username: c.username,
    staticIp: c.staticIp,
    address: c.address,
    reseller: c.reseller.user.name,
    status: c.status,
    createdAt: c.createdAt,
  }));
  const paymentLog = payments.map((p) => ({
    id: p.id,
    amount: p.amount,
    method: p.method,
    trxId: p.trxId,
    customerName: (p.bill?.customer as any)?.user?.name ?? (p.customer as any)?.name,
    customerPhone: (p.customer as any)?.phone,
    createdAt: p.createdAt,
  }));
  return { userList, paymentLog };
}

router.get('/reports/btrc', async (req, res, next) => {
  try {
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const { userList, paymentLog } = await getBtrcReportData(month, year);
    res.json({
      period: {
        month,
        year,
        start: new Date(year, month - 1, 1),
        end: new Date(year, month, 0, 23, 59, 59),
      },
      userList,
      paymentLog,
    });
  } catch (e) {
    next(e);
  }
});

function escapeCsv(val: unknown): string {
  const s = String(val ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

router.get('/reports/btrc/export', async (req, res, next) => {
  try {
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const format = (req.query.format as string) || 'csv';
    const { userList, paymentLog } = await getBtrcReportData(month, year);

    if (format === 'csv') {
      const userHeaders = ['Name', 'Phone', 'Email', 'Package', 'Speed (Mbps)', 'Connection', 'Username', 'Static IP', 'Address', 'Reseller', 'Status', 'Created'];
      const userRows = userList.map((u: any) => [
        u.name, u.phone, u.email, u.package, u.speedMbps, u.connectionType, u.username, u.staticIp, u.address, u.reseller, u.status,
        u.createdAt ? new Date(u.createdAt).toISOString() : '',
      ].map(escapeCsv).join(','));
      const paymentHeaders = ['Customer Name', 'Customer Phone', 'Amount', 'Method', 'Trx ID', 'Date'];
      const paymentRows = paymentLog.map((p: any) => [
        p.customerName, p.customerPhone, p.amount, p.method, p.trxId,
        p.createdAt ? new Date(p.createdAt).toISOString() : '',
      ].map(escapeCsv).join(','));
      const csv = [
        'BTRC User List',
        userHeaders.map(escapeCsv).join(','),
        ...userRows,
        '',
        'Payment Log',
        paymentHeaders.map(escapeCsv).join(','),
        ...paymentRows,
      ].join('\r\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="btrc-report-${year}-${month}.csv"`);
      res.send('\uFEFF' + csv);
      return;
    }
    next(new AppError(400, 'Unsupported format. Use format=csv'));
  } catch (e) {
    next(e);
  }
});

// Client list export (PPPoE/Password/Profile to CSV or PDF-friendly HTML)
router.get('/customers/export', async (req, res, next) => {
  try {
    const status = req.query.status as string | undefined;
    const resellerId = req.query.resellerId as string | undefined;
    const format = (req.query.format as string) || 'csv';
    const where: Prisma.CustomerProfileWhereInput = {};
    if (status) where.status = status as any;
    if (resellerId) where.resellerId = resellerId;
    const list = await prisma.customerProfile.findMany({
      where,
      include: {
        user: { select: { name: true, phone: true, email: true } },
        package: true,
        reseller: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (format === 'pdf' || format === 'html') {
      const headers = ['Name', 'Phone', 'Username', 'Password', 'Profile', 'Speed (Mbps)', 'Status', 'Reseller', 'Address', 'Left At', 'Left Reason'];
      const rows = list.map((c) => [
        c.user?.name ?? '',
        c.user?.phone ?? '',
        c.username ?? '',
        (c as any).pppoePassword ?? '',
        c.package?.name ?? '',
        String(c.package?.speedMbps ?? ''),
        c.status,
        c.reseller?.user?.name ?? '',
        c.address ?? '',
        c.leftAt ? new Date(c.leftAt).toLocaleString() : '',
        c.leftReason ?? '',
      ]);
      const th = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
      const trs = rows.map((r) => '<tr>' + r.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('') + '</tr>').join('');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Client List</title><style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:6px;text-align:left}th{background:#eee}@media print{body{font-size:10px}}</style></head><body><h1>Client List (${list.length} rows)</h1><p>Generated: ${new Date().toLocaleString()}</p><table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table><p>Print this page to save as PDF.</p></body></html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="clients-export.html"`);
      res.send(html);
      return;
    }
    const headers = ['Name', 'Phone', 'Username', 'Password', 'Profile (Package)', 'Speed (Mbps)', 'Status', 'Reseller', 'Address', 'Left At', 'Left Reason'];
    const rows = list.map((c) => [
      c.user?.name ?? '',
      c.user?.phone ?? '',
      c.username ?? '',
      (c as any).pppoePassword ?? '',
      c.package?.name ?? '',
      c.package?.speedMbps ?? '',
      c.status,
      c.reseller?.user?.name ?? '',
      c.address ?? '',
      c.leftAt ? new Date(c.leftAt).toISOString() : '',
      c.leftReason ?? '',
    ].map(escapeCsv).join(','));
    const csv = [headers.map(escapeCsv).join(','), ...rows].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="clients-export.csv"');
    res.send('\uFEFF' + csv);
  } catch (e) {
    next(e);
  }
});

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Bulk status change (admin: any customer)
router.patch('/customers/bulk-status', [
  body('customerIds').isArray(),
  body('customerIds.*').isString(),
  body('status').isIn(['ACTIVE', 'INACTIVE', 'BLOCKED', 'PENDING', 'PERSONAL', 'FREE', 'LEFT']),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const { customerIds, status } = req.body;
    const result = await prisma.customerProfile.updateMany({
      where: { id: { in: customerIds } },
      data: { status: status as any },
    });
    res.json({ updated: result.count });
  } catch (e) {
    next(e);
  }
});

// List customers (admin: all; filter by status, resellerId, packageId, zoneArea, date range)
router.get('/customers', async (req, res, next) => {
  try {
    const status = req.query.status as string | undefined;
    const resellerId = req.query.resellerId as string | undefined;
    const packageId = req.query.packageId as string | undefined;
    const zoneArea = req.query.zoneArea as string | undefined;
    const createdAtFrom = req.query.createdAtFrom as string | undefined;
    const createdAtTo = req.query.createdAtTo as string | undefined;
    const where: Prisma.CustomerProfileWhereInput = {};
    if (status) where.status = status as any;
    if (resellerId) where.resellerId = resellerId;
    if (packageId) where.packageId = packageId;
    if (zoneArea) where.zoneArea = { contains: zoneArea };
    if (createdAtFrom || createdAtTo) {
      where.createdAt = {};
      if (createdAtFrom) where.createdAt.gte = new Date(createdAtFrom);
      if (createdAtTo) where.createdAt.lte = new Date(createdAtTo);
    }
    const list = await prisma.customerProfile.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
        package: true,
        reseller: { include: { user: { select: { name: true } } } },
        assignedToUser: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

// Full client profile with history and logs (bills, payments, usage, tickets)
router.get('/customers/:id/profile', async (req, res, next) => {
  try {
    const id = req.params.id;
    const profile = await prisma.customerProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true, createdAt: true } },
        package: true,
        reseller: { include: { user: { select: { name: true, phone: true } } } },
        assignedToUser: { select: { id: true, name: true, phone: true } },
      },
    });
    if (!profile) throw new AppError(404, 'Customer not found');
    const [bills, payments, usageLogs, tickets] = await Promise.all([
      prisma.bill.findMany({ where: { customerId: id }, include: { package: true, payments: true }, orderBy: { dueDate: 'desc' }, take: 50 }),
      prisma.payment.findMany({ where: { customerId: profile.userId }, include: { bill: true }, orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.usageLog.findMany({ where: { customerId: id }, orderBy: { date: 'desc' }, take: 30 }),
      prisma.ticket.findMany({ where: { customerId: profile.userId }, orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);
    res.json({ profile, bills, payments, usageLogs, tickets });
  } catch (e) {
    next(e);
  }
});

// Change PPPoE password from app and push to MikroTik
router.patch('/customers/:id/pppoe-password', [
  body('password').trim().notEmpty().isLength({ min: 1 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const id = req.params.id;
    const profile = await prisma.customerProfile.findUnique({ where: { id }, include: { package: true } });
    if (!profile?.username) throw new AppError(404, 'Customer or PPPoE username not found');
    const newPassword = req.body.password as string;
    const { setPppoePasswordOnMikrotik } = await import('../services/mikrotik.js');
    await setPppoePasswordOnMikrotik(profile.username, newPassword);
    await prisma.customerProfile.update({
      where: { id },
      data: { pppoePassword: newPassword, mikrotikSynced: true, lastSyncAt: new Date() },
    });
    res.json({ ok: true, message: 'Password updated and synced to MikroTik.' });
  } catch (e) {
    next(e);
  }
});

// MAC address bind/unbind (update DB; optionally push caller-id to MikroTik)
router.patch('/customers/:id/mac', [
  body('macAddress').optional({ values: 'falsy' }).trim(),
  body('pushToMikrotik').optional().isBoolean(),
], async (req, res, next) => {
  try {
    const id = req.params.id;
    const macAddress = (req.body.macAddress as string) || null;
    const pushToMikrotik = req.body.pushToMikrotik === true;
    const profile = await prisma.customerProfile.findUnique({ where: { id } });
    if (!profile) throw new AppError(404, 'Customer not found');
    await prisma.customerProfile.update({ where: { id }, data: { macAddress } });
    if (pushToMikrotik && profile.username && macAddress) {
      try {
        const { setPppCallerIdOnMikrotik } = await import('../services/mikrotik.js');
        await setPppCallerIdOnMikrotik(profile.username, macAddress);
      } catch (_) {
        // MikroTik optional; don't fail the request
      }
    }
    const updated = await prisma.customerProfile.findUnique({ where: { id }, include: { user: true, package: true } });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// Assign customer to employee
router.patch('/customers/:id/assign', [
  body('assignedToUserId').optional({ values: 'falsy' }).isString(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const id = req.params.id;
    const assignedToUserId = req.body.assignedToUserId || null;
    if (assignedToUserId) {
      const emp = await prisma.user.findFirst({ where: { id: assignedToUserId, role: 'EMPLOYEE' } });
      if (!emp) throw new AppError(400, 'User is not an employee');
    }
    const updated = await prisma.customerProfile.update({
      where: { id },
      data: { assignedToUserId },
      include: { user: true, package: true, assignedToUser: { select: { id: true, name: true, phone: true } } },
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// Employees list (for assign dropdown)
router.get('/employees', async (_req, res, next) => {
  try {
    const list = await prisma.user.findMany({
      where: { role: 'EMPLOYEE', isActive: true },
      select: { id: true, name: true, phone: true },
      orderBy: { name: 'asc' },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

// Create employee (admin only)
router.post('/employees', [
  body('phone').trim().notEmpty(),
  body('password').isLength({ min: 6 }),
  body('name').trim().notEmpty(),
  body('email').optional().trim(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const existing = await prisma.user.findUnique({ where: { phone: req.body.phone } });
    if (existing) throw new AppError(400, 'Phone already registered');
    const passwordHash = await bcrypt.hash(req.body.password, 10);
    const user = await prisma.user.create({
      data: {
        phone: req.body.phone,
        email: req.body.email || null,
        passwordHash,
        name: req.body.name,
        role: 'EMPLOYEE',
      },
      select: { id: true, name: true, phone: true, email: true, role: true },
    });
    res.status(201).json(user);
  } catch (e) {
    next(e);
  }
});

// Schedule rules (status/package change at a future time)
router.get('/schedule-rules', async (req, res, next) => {
  try {
    const list = await prisma.scheduleRule.findMany({
      where: { appliedAt: null },
      include: { customer: { include: { user: { select: { name: true, phone: true } }, package: true } } },
      orderBy: { scheduledAt: 'asc' },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/schedule-rules', [
  body('customerId').isString(),
  body('scheduledAt').isISO8601(),
  body('newStatus').optional().isIn(['ACTIVE', 'INACTIVE', 'BLOCKED', 'PENDING', 'PERSONAL', 'FREE', 'LEFT']),
  body('newPackageId').optional().isString(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const { customerId, scheduledAt, newStatus, newPackageId } = req.body;
    const rule = await prisma.scheduleRule.create({
      data: {
        customerId,
        scheduledAt: new Date(scheduledAt),
        newStatus: newStatus || null,
        newPackageId: newPackageId || null,
      },
      include: { customer: { include: { user: true, package: true } } },
    });
    res.status(201).json(rule);
  } catch (e) {
    next(e);
  }
});

router.delete('/schedule-rules/:id', async (req, res, next) => {
  try {
    await prisma.scheduleRule.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Customer change requests (package/status from portal) – list and approve/reject
router.get('/customer-requests', async (req, res, next) => {
  try {
    const status = req.query.status as string | undefined;
    const where: Prisma.CustomerRequestWhereInput = {};
    if (status) where.status = status as any;
    const list = await prisma.customerRequest.findMany({
      where,
      include: {
        customer: { include: { user: { select: { name: true, phone: true } }, package: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.patch('/customer-requests/:id', [
  body('status').isIn(['APPROVED', 'REJECTED']),
  body('notes').optional().trim(),
], async (req: AuthRequest, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const id = req.params.id;
    const { status, notes } = req.body;
    const reqRow = await prisma.customerRequest.findUnique({ where: { id }, include: { customer: true } });
    if (!reqRow) throw new AppError(404, 'Request not found');
    if (reqRow.status !== 'PENDING') throw new AppError(400, 'Request already processed');
    const updateData: any = { status, reviewedBy: req.user!.id, reviewedAt: new Date(), notes: notes || null };
    if (status === 'APPROVED') {
      const profileUpdate: any = {};
      if (reqRow.requestedPackageId) profileUpdate.packageId = reqRow.requestedPackageId;
      if (reqRow.requestedStatus) profileUpdate.status = reqRow.requestedStatus;
      if (Object.keys(profileUpdate).length) {
        await prisma.customerProfile.update({
          where: { id: reqRow.customerId },
          data: profileUpdate,
        });
      }
    }
    const updated = await prisma.customerRequest.update({
      where: { id },
      data: updateData,
      include: { customer: { include: { user: true, package: true } } },
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// New client requests (add new client – request → approve → create User+CustomerProfile)
router.get('/new-client-requests', async (req, res, next) => {
  try {
    const status = req.query.status as string | undefined;
    const where: any = {};
    if (status) where.status = status;
    const list = await prisma.newClientRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.patch('/new-client-requests/:id', [
  body('status').isIn(['APPROVED', 'REJECTED']),
  body('resellerId').optional().trim(),
  body('packageId').optional().trim(),
  body('password').optional().isLength({ min: 6 }),
  body('notes').optional().trim(),
], async (req: AuthRequest, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const id = req.params.id;
    const { status, resellerId: bodyResellerId, packageId: bodyPackageId, password: bodyPassword, notes } = req.body;
    const reqRow = await prisma.newClientRequest.findUnique({ where: { id } });
    if (!reqRow) throw new AppError(404, 'Request not found');
    if (reqRow.status !== 'PENDING') throw new AppError(400, 'Request already processed');

    if (status === 'APPROVED') {
      let resellerId = bodyResellerId || reqRow.resellerId;
      let packageId = bodyPackageId || reqRow.packageId;
      if (!resellerId) {
        const unassigned = await prisma.resellerProfile.findFirst({ where: { companyName: 'Unassigned' }, select: { id: true } });
        resellerId = unassigned?.id ?? null;
      }
      if (!resellerId) throw new AppError(400, 'Reseller required. Provide resellerId or run MikroTik Import once to create Unassigned.');
      const pkg = packageId
        ? await prisma.package.findFirst({ where: { id: packageId, isActive: true } })
        : await prisma.package.findFirst({ where: { isActive: true }, orderBy: { speedMbps: 'asc' } });
      if (!pkg) throw new AppError(400, 'No active package. Create a package or provide packageId.');
      const existingUser = await prisma.user.findUnique({ where: { phone: reqRow.phone } });
      if (existingUser) throw new AppError(400, 'Phone already registered.');
      const defaultPassword = bodyPassword || reqRow.phone.slice(-6) + 'Ab1';
      const passwordHash = await bcrypt.hash(defaultPassword, 10);
      const user = await prisma.user.create({
        data: {
          phone: reqRow.phone,
          passwordHash,
          name: reqRow.name,
          role: 'CUSTOMER',
        },
      });
      const username = reqRow.connectionType === 'PPPoE' ? (reqRow.requestedUsername || reqRow.phone) : null;
      const customer = await prisma.customerProfile.create({
        data: {
          userId: user.id,
          resellerId,
          packageId: pkg.id,
          connectionType: reqRow.connectionType,
          username,
          staticIp: reqRow.requestedStaticIp || null,
          address: reqRow.address || null,
          status: 'PENDING',
        },
      });
      await prisma.newClientRequest.update({
        where: { id },
        data: { status: 'APPROVED', reviewedBy: req.user!.id, reviewedAt: new Date(), notes: notes || null, createdCustomerId: customer.id },
      });
      return res.json({ ok: true, customerId: customer.id, userId: user.id, message: 'Client created.' });
    }

    await prisma.newClientRequest.update({
      where: { id },
      data: { status: 'REJECTED', reviewedBy: req.user!.id, reviewedAt: new Date(), notes: notes || null },
    });
    res.json({ ok: true, message: 'Request rejected.' });
  } catch (e) {
    next(e);
  }
});

// Mark customer as left (archive)
router.patch('/customers/:id/left', [
  body('leftReason').optional().trim(),
], async (req, res, next) => {
  try {
    const id = req.params.id;
    const leftReason = (req.body.leftReason as string) || null;
    await prisma.customerProfile.update({
      where: { id },
      data: { status: 'LEFT', leftAt: new Date(), leftReason },
    });
    const updated = await prisma.customerProfile.findUnique({
      where: { id },
      include: { user: true, package: true },
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// Payment gateway verify – uses paymentGateway service (plug in real API)
router.post('/payment/verify', [
  body('method').isIn(['BKASH', 'NAGAD', 'ROCKET']),
  body('trxId').trim().notEmpty(),
  body('amount').isFloat({ min: 0 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const { method, trxId, amount } = req.body;
    const { verifyTransaction } = await import('../services/paymentGateway.js');
    const result = await verifyTransaction(method, trxId, amount);
    if (!result.verified) {
      return res.status(400).json({ verified: false, error: result.error || 'Verification failed' });
    }
    res.json({ verified: true, method, trxId, amount: result.amount ?? amount });
  } catch (e) {
    next(e);
  }
});

// Bills list (admin: all) with filters: month, year, status, dueDateFrom, dueDateTo, resellerId
router.get('/bills', async (req, res, next) => {
  try {
    const month = req.query.month as string | undefined;
    const year = req.query.year as string | undefined;
    const status = req.query.status as string | undefined;
    const dueDateFrom = req.query.dueDateFrom as string | undefined;
    const dueDateTo = req.query.dueDateTo as string | undefined;
    const resellerId = req.query.resellerId as string | undefined;
    const where: Prisma.BillWhereInput = {};
    if (status) where.status = status as any;
    if (resellerId) where.customer = { resellerId };
    if (month && year) {
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      if (!isNaN(m) && !isNaN(y)) { where.month = m; where.year = y; }
    }
    if (dueDateFrom || dueDateTo) {
      where.dueDate = {};
      if (dueDateFrom) where.dueDate.gte = new Date(dueDateFrom);
      if (dueDateTo) where.dueDate.lte = new Date(dueDateTo);
    }
    const list = await prisma.bill.findMany({
      where,
      include: {
        customer: { include: { user: { select: { name: true, phone: true } }, package: true, reseller: { include: { user: { select: { name: true } } } } } },
        package: true,
        payments: true,
      },
      orderBy: { dueDate: 'desc' },
      take: 500,
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

// Billing list export (PDF/Excel = HTML for print, CSV)
router.get('/bills/export', async (req, res, next) => {
  try {
    const month = req.query.month as string | undefined;
    const year = req.query.year as string | undefined;
    const status = req.query.status as string | undefined;
    const format = (req.query.format as string) || 'csv';
    const where: Prisma.BillWhereInput = {};
    if (status) where.status = status as any;
    if (month && year) {
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      if (!isNaN(m) && !isNaN(y)) { where.month = m; where.year = y; }
    }
    const list = await prisma.bill.findMany({
      where,
      include: {
        customer: { include: { user: { select: { name: true, phone: true } }, package: true, reseller: { include: { user: { select: { name: true } } } } } },
        package: true,
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { dueDate: 'desc' }],
      take: 2000,
    });
    if (format === 'pdf' || format === 'html') {
      const rows = list.map((b) => [
        b.customer?.user?.name ?? '',
        b.customer?.user?.phone ?? '',
        b.package?.name ?? '',
        String(b.amount),
        new Date(b.dueDate).toLocaleDateString(),
        b.status,
        b.customer?.reseller?.user?.name ?? '',
      ]);
      const headers = ['Customer', 'Phone', 'Package', 'Amount', 'Due Date', 'Status', 'Reseller'];
      const th = headers.map((h) => `<th>${h.replace(/</g, '&lt;')}</th>`).join('');
      const trs = rows.map((r) => '<tr>' + r.map((c) => `<td>${String(c).replace(/</g, '&lt;')}</td>`).join('') + '</tr>').join('');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Billing List</title><style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:6px}</style></head><body><h1>Billing List (${list.length})</h1><table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table></body></html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="billing-list.html"');
      return res.send(html);
    }
    const headers = ['Customer', 'Phone', 'Package', 'Amount', 'Due Date', 'Status', 'Reseller'];
    const csvRows = list.map((b) => [
      b.customer?.user?.name ?? '',
      b.customer?.user?.phone ?? '',
      b.package?.name ?? '',
      b.amount,
      new Date(b.dueDate).toISOString().slice(0, 10),
      b.status,
      b.customer?.reseller?.user?.name ?? '',
    ].map(escapeCsv).join(','));
    const csv = ['\uFEFF' + headers.map(escapeCsv).join(','), ...csvRows].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="billing-list.csv"');
    res.send(csv);
  } catch (e) {
    next(e);
  }
});

// Billing date extended – extend due date
router.patch('/bills/:id/extend', [
  body('dueDate').optional().isISO8601(),
  body('extendDays').optional().isInt({ min: 1, max: 365 }).toInt(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const id = req.params.id;
    const bill = await prisma.bill.findUnique({ where: { id } });
    if (!bill) throw new AppError(404, 'Bill not found');
    let newDue: Date;
    if (req.body.dueDate) newDue = new Date(req.body.dueDate);
    else if (req.body.extendDays) {
      newDue = new Date(bill.dueDate);
      newDue.setDate(newDue.getDate() + req.body.extendDays);
    } else throw new AppError(400, 'Provide dueDate or extendDays');
    const updated = await prisma.bill.update({
      where: { id },
      data: { dueDate: newDue },
      include: { customer: { include: { user: true } }, package: true },
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// Single bill invoice (printable HTML)
router.get('/bills/:id/invoice', async (req, res, next) => {
  try {
    const id = req.params.id;
    const bill = await prisma.bill.findUnique({
      where: { id },
      include: {
        customer: { include: { user: true, reseller: { include: { user: true, companyName: true, receiptHeader: true, receiptFooter: true } }, package: true } },
        package: true,
        payments: true,
      },
    });
    if (!bill) throw new AppError(404, 'Bill not found');
    const discount = Number((bill as any).discountAmount ?? 0);
    const total = Number(bill.amount) - discount;
    const paid = bill.payments.reduce((s, p) => s + Number(p.amount), 0);
    const due = Math.max(0, total - paid);
    const reseller = bill.customer?.reseller as any;
    const header = reseller?.receiptHeader ?? reseller?.companyName ?? 'ISP';
    const footer = reseller?.receiptFooter ?? 'Thank you';
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

// Generate payment link (outside pay without login)
router.post('/bills/:id/payment-link', [
  body('expiresInDays').optional().isInt({ min: 1, max: 90 }).toInt(),
], async (req, res, next) => {
  try {
    const id = req.params.id;
    const bill = await prisma.bill.findUnique({ where: { id } });
    if (!bill) throw new AppError(404, 'Bill not found');
    if (bill.status === 'PAID') throw new AppError(400, 'Bill already paid');
    const { randomUUID } = await import('crypto');
    const token = randomUUID().replace(/-/g, '');
    const expiresInDays = req.body.expiresInDays ?? 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    await prisma.bill.update({
      where: { id },
      data: { paymentToken: token, paymentTokenExpiresAt: expiresAt },
    });
    const baseUrl = process.env.FRONTEND_URL || process.env.PUBLIC_URL || 'http://localhost:5173';
    const link = `${baseUrl}/pay/${token}`;
    res.json({ token, link, expiresAt });
  } catch (e) {
    next(e);
  }
});

// Money receipt (printable HTML – for pocket printer or browser print)
router.get('/receipt/payment/:paymentId', async (req, res, next) => {
  try {
    const paymentId = req.params.paymentId;
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        bill: { include: { package: true, customer: { include: { user: true, reseller: true } } } },
        customer: { select: { name: true, phone: true } },
      },
    });
    if (!payment?.bill) throw new AppError(404, 'Payment not found');
    const b = payment.bill;
    const header = (b.customer?.reseller as any)?.receiptHeader ?? (b.customer?.reseller as any)?.companyName ?? 'ISP';
    const footer = (b.customer?.reseller as any)?.receiptFooter ?? 'Thank you';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt</title><style>body{font-family:monospace;max-width:300px;margin:1em;font-size:12px}hr{margin:0.5em 0}table{width:100%}</style></head><body>
<div>${String(header).replace(/</g, '&lt;')}</div><hr>
<div><strong>Money Receipt</strong></div>
<div>Date: ${new Date(payment.createdAt).toLocaleString()}</div>
<div>Customer: ${(payment.customer?.name ?? b.customer?.user?.name ?? '').replace(/</g, '&lt;')}</div>
<div>Phone: ${(payment.customer?.phone ?? b.customer?.user?.phone ?? '').replace(/</g, '&lt;')}</div>
<div>Package: ${(b.package?.name ?? '').replace(/</g, '&lt;')}</div>
<div>Bill Amount: BDT ${b.amount}</div>
<div>Paid: BDT ${payment.amount}</div>
<div>Method: ${payment.method}${payment.trxId ? ' | TrxID: ' + payment.trxId : ''}</div><hr>
<div>${String(footer).replace(/</g, '&lt;')}</div>
</body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) {
    next(e);
  }
});

// Send money receipt to client via SMS
router.post('/payments/:paymentId/send-receipt', async (req, res, next) => {
  try {
    const paymentId = req.params.paymentId;
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        bill: { include: { package: true, customer: { include: { user: true } } } },
        customer: { select: { phone: true } },
      },
    });
    if (!payment?.bill) throw new AppError(404, 'Payment not found');
    const phone = payment.customer?.phone ?? payment.bill.customer?.user?.phone;
    if (!phone) throw new AppError(400, 'Customer phone not found');
    const msg = `Receipt: Paid BDT ${payment.amount} (${payment.method}) for ${payment.bill.package?.name ?? 'bill'}. Date: ${new Date(payment.createdAt).toLocaleDateString()}. Thank you.`;
    const { sendSms } = await import('../services/sms.js');
    await sendSms(phone, msg, 'RECEIPT');
    res.json({ ok: true, message: 'Receipt SMS sent.' });
  } catch (e) {
    next(e);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const role = req.query.role as string | undefined;
    const where: Prisma.UserWhereInput = {};
    if (role && ['ADMIN', 'RESELLER', 'CUSTOMER', 'EMPLOYEE'].includes(role)) {
      where.role = role as Role;
    }
    const users = await prisma.user.findMany({
      where,
      include: {
        resellerProfile: true,
        customerProfile: { include: { package: true, reseller: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    res.json(users);
  } catch (e) {
    next(e);
  }
});

export { router as adminRouter };
