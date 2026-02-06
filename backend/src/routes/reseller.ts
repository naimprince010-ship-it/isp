import { Router, type Response, type NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, requireReseller, type AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { ConnectionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const router = Router();
router.use(authMiddleware);
router.use(requireReseller);

function getResellerId(req: AuthRequest): string {
  const id = req.user!.resellerId;
  if (!id) throw new AppError(403, 'Reseller profile not found');
  return id;
}

// Reseller dashboard: balance, customer count, collection summary
router.get('/dashboard', async (req: AuthRequest, res, next) => {
  try {
    const resellerId = getResellerId(req);
    const profile = await prisma.resellerProfile.findUnique({
      where: { id: resellerId },
      include: { user: { select: { name: true, phone: true } } },
    });
    if (!profile) throw new AppError(404, 'Reseller not found');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [customerCount, activeCount, monthlyCollection, pendingBills] = await Promise.all([
      prisma.customerProfile.count({ where: { resellerId } }),
      prisma.customerProfile.count({ where: { resellerId, status: 'ACTIVE' } }),
      prisma.payment.aggregate({
        where: {
          bill: { customer: { resellerId } },
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      }),
      prisma.bill.aggregate({
        where: { customer: { resellerId }, status: 'PENDING' },
        _sum: { amount: true },
      }),
    ]);

    res.json({
      profile: {
        ...profile,
        currentBalance: Number(profile.currentBalance),
        balanceLimit: Number(profile.balanceLimit),
      },
      customerCount,
      activeCount,
      monthlyCollection: Number(monthlyCollection._sum.amount ?? 0),
      pendingBillsAmount: Number(pendingBills._sum.amount ?? 0),
      period: { start: startOfMonth, end: endOfMonth },
    });
  } catch (e) {
    next(e);
  }
});

// User provisioning: list my customers (with filters: status, packageId, zoneArea)
router.get('/customers', async (req: AuthRequest, res, next) => {
  try {
    const resellerId = getResellerId(req);
    const status = req.query.status as string | undefined;
    const packageId = req.query.packageId as string | undefined;
    const zoneArea = req.query.zoneArea as string | undefined;
    const where: Prisma.CustomerProfileWhereInput = { resellerId };
    if (status) where.status = status as ConnectionStatus;
    if (packageId) where.packageId = packageId;
    if (zoneArea) where.zoneArea = { contains: zoneArea };
    const list = await prisma.customerProfile.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
        package: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

// Full client profile with history (reseller: own customers only)
router.get('/customers/:id/profile', async (req: AuthRequest, res, next) => {
  try {
    const resellerId = getResellerId(req);
    const id = req.params.id;
    const profile = await prisma.customerProfile.findFirst({
      where: { id, resellerId },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true, createdAt: true } },
        package: true,
        reseller: { include: { user: { select: { name: true, phone: true } } } },
      },
    });
    if (!profile) throw new AppError(404, 'Customer not found');
    const [bills, payments, tickets] = await Promise.all([
      prisma.bill.findMany({ where: { customerId: id }, include: { package: true, payments: true }, orderBy: { dueDate: 'desc' }, take: 50 }),
      prisma.payment.findMany({ where: { customerId: profile.userId }, include: { bill: true }, orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.ticket.findMany({ where: { customerId: profile.userId }, orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);
    const usageLogs = await prisma.usageLog.findMany({ where: { customerId: id }, orderBy: { date: 'desc' }, take: 30 });
    res.json({ profile, bills, payments, usageLogs, tickets });
  } catch (e) {
    next(e);
  }
});

// Change PPPoE password and push to MikroTik (reseller: own customer only)
router.patch('/customers/:id/pppoe-password', [
  body('password').trim().notEmpty().isLength({ min: 1 }),
], async (req: AuthRequest, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const resellerId = getResellerId(req);
    const id = req.params.id;
    const profile = await prisma.customerProfile.findFirst({ where: { id, resellerId } });
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

// MAC address bind/unbind (reseller: own customer only)
router.patch('/customers/:id/mac', [
  body('macAddress').optional({ values: 'falsy' }).trim(),
  body('pushToMikrotik').optional().isBoolean(),
], async (req: AuthRequest, res, next) => {
  try {
    const resellerId = getResellerId(req);
    const id = req.params.id;
    const macAddress = (req.body.macAddress as string) || null;
    const pushToMikrotik = req.body.pushToMikrotik === true;
    const profile = await prisma.customerProfile.findFirst({ where: { id, resellerId } });
    if (!profile) throw new AppError(404, 'Customer not found');
    await prisma.customerProfile.update({ where: { id }, data: { macAddress } });
    if (pushToMikrotik && profile.username && macAddress) {
      try {
        const { setPppCallerIdOnMikrotik } = await import('../services/mikrotik.js');
        await setPppCallerIdOnMikrotik(profile.username, macAddress);
      } catch (_) {}
    }
    const updated = await prisma.customerProfile.findUnique({ where: { id }, include: { user: true, package: true } });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// Create customer (reseller provisions user)
router.post(
  '/customers',
  [
    body('phone').trim().notEmpty(),
    body('password').isLength({ min: 6 }),
    body('name').trim().notEmpty(),
    body('packageId').trim().notEmpty(),
    body('connectionType').isIn(['PPPoE', 'Static']),
    body('username').optional().trim(), // PPPoE username
    body('staticIp').optional().trim(),
    body('address').optional().trim(),
    body('zoneArea').optional().trim(),
  ],
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
      const resellerId = getResellerId(req);
      const profile = await prisma.resellerProfile.findUnique({ where: { id: resellerId } });
      if (!profile) throw new AppError(404, 'Reseller not found');
      const resellerUser = await prisma.user.findFirst({ where: { resellerProfile: { id: resellerId } }, select: { id: true } });
      if (!resellerUser) throw new AppError(404, 'Reseller user not found');
      const resellerUserId = resellerUser.id;
      const balance = Number(profile.currentBalance);
      const pkg = await prisma.package.findFirst({ where: { id: req.body.packageId, isActive: true } });
      if (!pkg) throw new AppError(400, 'Invalid package');
      const billAmount = Number(pkg.price);
      if (balance < billAmount) throw new AppError(400, 'Insufficient balance. Recharge first.');

      const existingUser = await prisma.user.findUnique({ where: { phone: req.body.phone } });
      let userId: string;
      if (existingUser) {
        if (existingUser.role !== 'CUSTOMER' || existingUser.resellerId !== resellerUserId) {
          throw new AppError(400, 'Phone already registered elsewhere');
        }
        userId = existingUser.id;
      } else {
        const passwordHash = await bcrypt.hash(req.body.password, 10);
        const newUser = await prisma.user.create({
          data: {
            phone: req.body.phone,
            name: req.body.name,
            passwordHash,
            role: 'CUSTOMER',
            resellerId: resellerUserId,
          },
        });
        userId = newUser.id;
      }

      const existingCustomer = await prisma.customerProfile.findFirst({
        where: { userId, resellerId },
      });
      if (existingCustomer) throw new AppError(400, 'Customer already exists under your account');

      const customer = await prisma.$transaction(async (tx) => {
        const c = await tx.customerProfile.create({
          data: {
            userId,
            resellerId,
            packageId: req.body.packageId,
            connectionType: req.body.connectionType,
            username: req.body.username || req.body.phone,
            staticIp: req.body.staticIp || null,
            address: req.body.address || null,
            zoneArea: req.body.zoneArea || null,
            status: 'PENDING', // Activate after first payment
          },
        });
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (pkg.validityDays || 30));
        await tx.bill.create({
          data: {
            customerId: c.id,
            packageId: pkg.id,
            amount: pkg.price,
            dueDate,
            status: 'PENDING',
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
          },
        });
        const newBal = Prisma.Decimal.sub(profile.currentBalance, pkg.price);
        await tx.resellerProfile.update({
          where: { id: resellerId },
          data: { currentBalance: newBal },
        });
        return c;
      });

      const withRelations = await prisma.customerProfile.findUnique({
        where: { id: customer.id },
        include: { user: { select: { name: true, phone: true } }, package: true },
      });
      res.status(201).json(withRelations);
    } catch (e) {
      next(e);
    }
  }
);

// Bulk status change (reseller: only own customers)
router.patch('/customers/bulk-status', [
  body('customerIds').isArray(),
  body('customerIds.*').isString(),
  body('status').isIn(['ACTIVE', 'INACTIVE', 'BLOCKED', 'PENDING', 'PERSONAL', 'FREE', 'LEFT']),
], async (req: AuthRequest, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const resellerId = getResellerId(req);
    const { customerIds, status } = req.body;
    const result = await prisma.customerProfile.updateMany({
      where: { id: { in: customerIds }, resellerId },
      data: { status: status as ConnectionStatus },
    });
    res.json({ updated: result.count });
  } catch (e) {
    next(e);
  }
});

// Block / Unblock customer
router.patch('/customers/:id/status', async (req: AuthRequest, res, next) => {
  try {
    const resellerId = getResellerId(req);
    const status = req.body.status as ConnectionStatus;
    if (!['ACTIVE', 'BLOCKED', 'INACTIVE'].includes(status)) {
      throw new AppError(400, 'Invalid status');
    }
    const c = await prisma.customerProfile.updateMany({
      where: { id: req.params.id, resellerId },
      data: { status },
    });
    if (c.count === 0) throw new AppError(404, 'Customer not found');
    res.json({ ok: true, status });
  } catch (e) {
    next(e);
  }
});

// Bill collection: record payment; optional discountAmount, useAdvance (from customer advance), sendReceipt
router.post(
  '/bills/:billId/collect',
  [
    body('amount').isFloat({ min: 0.01 }),
    body('method').optional().isIn(['CASH', 'BKASH', 'NAGAD', 'ROCKET']),
    body('trxId').optional().trim(),
    body('notes').optional().trim(),
    body('sendReceipt').optional().isBoolean(),
    body('discountAmount').optional().isFloat({ min: 0 }),
    body('useAdvance').optional().isFloat({ min: 0 }),
  ],
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
      const resellerId = getResellerId(req);
      const bill = await prisma.bill.findFirst({
        where: { id: req.params.billId, customer: { resellerId } },
        include: { customer: { include: { user: true } }, package: true },
      });
      if (!bill) throw new AppError(404, 'Bill not found');
      const amount = new Prisma.Decimal(req.body.amount);
      const discountAmount = req.body.discountAmount != null ? new Prisma.Decimal(req.body.discountAmount) : new Prisma.Decimal((bill as any).discountAmount ?? 0);
      const useAdvance = req.body.useAdvance != null ? new Prisma.Decimal(req.body.useAdvance) : new Prisma.Decimal(0);
      if (discountAmount.gt(bill.amount)) throw new AppError(400, 'Discount cannot exceed bill amount');
      const effectiveTotal = Prisma.Decimal.sub(bill.amount, discountAmount);
      if (effectiveTotal.lte(0)) throw new AppError(400, 'Bill total after discount must be positive');
      const customerAdvance = new Prisma.Decimal((bill.customer as any).advanceBalance ?? 0);
      if (useAdvance.gt(0) && useAdvance.gt(customerAdvance)) throw new AppError(400, 'Insufficient advance balance');
      const paid = await prisma.payment.aggregate({
        where: { billId: bill.id },
        _sum: { amount: true },
      });
      const totalPaid = Prisma.Decimal.add(Prisma.Decimal.add(paid._sum.amount ?? 0, amount), useAdvance);
      const newStatus = totalPaid.gte(effectiveTotal) ? 'PAID' : 'PARTIAL';
      let advanceToAdd = new Prisma.Decimal(0);
      if (totalPaid.gt(effectiveTotal)) advanceToAdd = Prisma.Decimal.sub(totalPaid, effectiveTotal);
      const newAdvance = Prisma.Decimal.sub(Prisma.Decimal.add(customerAdvance, advanceToAdd), useAdvance);
      const billUpdateData: { status: string; paidAt?: Date; discountAmount?: Prisma.Decimal } = {
        status: newStatus,
        ...(newStatus === 'PAID' && { paidAt: new Date() }),
      };
      if (req.body.discountAmount != null) billUpdateData.discountAmount = discountAmount;
      await prisma.$transaction(async (tx) => {
        await tx.payment.create({
          data: {
            billId: bill.id,
            customerId: bill.customer.userId,
            amount,
            method: (req.body.method as any) || 'CASH',
            trxId: req.body.trxId || null,
            collectedBy: req.user!.id,
            notes: req.body.notes || null,
          },
        });
        if (useAdvance.gt(0)) {
          await tx.payment.create({
            data: {
              billId: bill.id,
              customerId: bill.customer.userId,
              amount: useAdvance,
              method: 'CASH',
              collectedBy: req.user!.id,
              notes: 'Advance applied',
            },
          });
        }
        await tx.bill.update({
          where: { id: bill.id },
          data: billUpdateData,
        });
        await tx.customerProfile.update({
          where: { id: bill.customerId },
          data: {
            ...(newStatus === 'PAID' && { status: 'ACTIVE' }),
            advanceBalance: newAdvance,
          },
        });
      });
      if (req.body.sendReceipt === true) {
        try {
          const { sendSms } = await import('../services/sms.js');
          const phone = bill.customer?.user?.phone;
          if (phone) {
            const msg = `Receipt: Paid BDT ${amount} (${req.body.method || 'CASH'}) for ${bill.package?.name ?? 'bill'}. Date: ${new Date().toLocaleDateString()}. Thank you.`;
            await sendSms(phone, msg, 'RECEIPT');
          }
        } catch (_) {}
      }
      const updated = await prisma.bill.findUnique({
        where: { id: bill.id },
        include: { payments: true },
      });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  }
);

// Extend bill due date (reseller: own customers only)
router.patch('/bills/:id/extend', [
  body('dueDate').optional().isISO8601(),
  body('extendDays').optional().isInt({ min: 1, max: 365 }).toInt(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const resellerId = getResellerId(req);
    const bill = await prisma.bill.findFirst({
      where: { id: req.params.id, customer: { resellerId } },
      include: { customer: { include: { user: true } }, package: true },
    });
    if (!bill) throw new AppError(404, 'Bill not found');
    let newDue: Date;
    if (req.body.dueDate) newDue = new Date(req.body.dueDate);
    else if (req.body.extendDays) {
      newDue = new Date(bill.dueDate);
      newDue.setDate(newDue.getDate() + req.body.extendDays);
    } else throw new AppError(400, 'Provide dueDate or extendDays');
    const updated = await prisma.bill.update({
      where: { id: bill.id },
      data: { dueDate: newDue },
      include: { customer: { include: { user: true } }, package: true },
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// Single bill invoice (printable HTML) – reseller: own customers only
router.get('/bills/:id/invoice', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const resellerId = getResellerId(req);
    const bill = await prisma.bill.findFirst({
      where: { id: req.params.id, customer: { resellerId } },
      include: {
        customer: {
          include: {
            user: true,
            reseller: { select: { companyName: true, receiptHeader: true, receiptFooter: true } },
            package: true,
          },
        },
        package: true,
        payments: true,
      },
    });
    if (!bill) throw new AppError(404, 'Bill not found');
    const discount = Number((bill as any).discountAmount ?? 0);
    const total = Number(bill.amount) - discount;
    const paid = (bill as any).payments.reduce((s: number, p: { amount: Prisma.Decimal }) => s + Number(p.amount), 0);
    const due = Math.max(0, total - paid);
    const resellerProfile = (bill as any).customer?.reseller;
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

// Generate payment link (reseller: own customers only)
router.post('/bills/:id/payment-link', [
  body('expiresInDays').optional().isInt({ min: 1, max: 90 }).toInt(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const resellerId = getResellerId(req);
    const bill = await prisma.bill.findFirst({
      where: { id: req.params.id, customer: { resellerId } },
    });
    if (!bill) throw new AppError(404, 'Bill not found');
    if (bill.status === 'PAID') throw new AppError(400, 'Bill already paid');
    const { randomUUID } = await import('crypto');
    const token = randomUUID().replace(/-/g, '');
    const expiresInDays = req.body.expiresInDays ?? 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    await prisma.bill.update({
      where: { id: bill.id },
      data: { paymentToken: token, paymentTokenExpiresAt: expiresAt },
    });
    const baseUrl = process.env.FRONTEND_URL || process.env.PUBLIC_URL || 'http://localhost:5173';
    const link = `${baseUrl}/pay/${token}`;
    res.json({ token, link, expiresAt });
  } catch (e) {
    next(e);
  }
});

// My recharge history
router.get('/recharges', async (req: AuthRequest, res, next) => {
  try {
    const resellerId = getResellerId(req);
    const list = await prisma.resellerRecharge.findMany({
      where: { resellerId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

// My branding (receipt header/footer, logo) - get & update
router.get('/branding', async (req: AuthRequest, res, next) => {
  try {
    const resellerId = getResellerId(req);
    const p = await prisma.resellerProfile.findUnique({
      where: { id: resellerId },
      select: { logoUrl: true, receiptHeader: true, receiptFooter: true, companyName: true },
    });
    if (!p) throw new AppError(404, 'Not found');
    res.json(p);
  } catch (e) {
    next(e);
  }
});

router.patch('/branding', async (req: AuthRequest, res, next) => {
  try {
    const resellerId = getResellerId(req);
    const p = await prisma.resellerProfile.update({
      where: { id: resellerId },
      data: {
        ...(req.body.logoUrl != null && { logoUrl: req.body.logoUrl }),
        ...(req.body.receiptHeader != null && { receiptHeader: req.body.receiptHeader }),
        ...(req.body.receiptFooter != null && { receiptFooter: req.body.receiptFooter }),
        ...(req.body.companyName != null && { companyName: req.body.companyName }),
      },
    });
    res.json(p);
  } catch (e) {
    next(e);
  }
});

// List bills under my customers (filters: status, month, year, dueDateFrom, dueDateTo)
router.get('/bills', async (req: AuthRequest, res, next) => {
  try {
    const resellerId = getResellerId(req);
    const status = req.query.status as string | undefined;
    const month = req.query.month as string | undefined;
    const year = req.query.year as string | undefined;
    const dueDateFrom = req.query.dueDateFrom as string | undefined;
    const dueDateTo = req.query.dueDateTo as string | undefined;
    const where: Prisma.BillWhereInput = { customer: { resellerId } };
    if (status) where.status = status as any;
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
        customer: { include: { user: { select: { name: true, phone: true } }, package: true } },
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

// Billing list export (CSV or HTML for print)
router.get('/bills/export', async (req: AuthRequest, res, next) => {
  try {
    const resellerId = getResellerId(req);
    const status = req.query.status as string | undefined;
    const month = req.query.month as string | undefined;
    const year = req.query.year as string | undefined;
    const format = (req.query.format as string) || 'csv';
    const where: Prisma.BillWhereInput = { customer: { resellerId } };
    if (status) where.status = status as any;
    if (month && year) {
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      if (!isNaN(m) && !isNaN(y)) { where.month = m; where.year = y; }
    }
    const list = await prisma.bill.findMany({
      where,
      include: {
        customer: { include: { user: { select: { name: true, phone: true } }, package: true } },
        package: true,
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { dueDate: 'desc' }],
      take: 2000,
    });
    function escapeCsv(val: unknown): string {
      const s = String(val ?? '');
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    }
    if (format === 'pdf' || format === 'html') {
      const rows = list.map((b) => [
        b.customer?.user?.name ?? '',
        b.customer?.user?.phone ?? '',
        b.package?.name ?? '',
        String(b.amount),
        new Date(b.dueDate).toLocaleDateString(),
        b.status,
      ]);
      const headers = ['Customer', 'Phone', 'Package', 'Amount', 'Due Date', 'Status'];
      const th = headers.map((h) => `<th>${h.replace(/</g, '&lt;')}</th>`).join('');
      const trs = rows.map((r) => '<tr>' + r.map((c) => `<td>${String(c).replace(/</g, '&lt;')}</td>`).join('') + '</tr>').join('');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Billing List</title><style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:6px}</style></head><body><h1>Billing List (${list.length})</h1><table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table></body></html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="billing-list.html"');
      return res.send(html);
    }
    const headers = ['Customer', 'Phone', 'Package', 'Amount', 'Due Date', 'Status'];
    const csvRows = list.map((b) => [
      b.customer?.user?.name ?? '',
      b.customer?.user?.phone ?? '',
      b.package?.name ?? '',
      b.amount,
      new Date(b.dueDate).toISOString().slice(0, 10),
      b.status,
    ].map(escapeCsv).join(','));
    const csv = ['\uFEFF' + headers.map(escapeCsv).join(','), ...csvRows].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="billing-list.csv"');
    res.send(csv);
  } catch (e) {
    next(e);
  }
});

// Money receipt (printable HTML – pocket printer or browser print)
router.get('/receipt/payment/:paymentId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const resellerId = getResellerId(req);
    const paymentId = req.params.paymentId;
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        bill: { include: { package: true, customer: { include: { user: true, reseller: { select: { companyName: true, receiptHeader: true, receiptFooter: true } } } } } },
        customer: { select: { name: true, phone: true } },
      },
    });
    if (!payment?.bill) throw new AppError(404, 'Payment not found');
    const b = (payment as any).bill;
    if (b.customer?.resellerId !== resellerId) throw new AppError(403, 'Not your customer');
    const reseller = b.customer?.reseller as any;
    const header = reseller?.receiptHeader ?? reseller?.companyName ?? 'ISP';
    const footer = reseller?.receiptFooter ?? 'Thank you';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt</title><style>body{font-family:monospace;max-width:300px;margin:1em;font-size:12px}hr{margin:0.5em 0}</style></head><body>
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
router.post('/payments/:paymentId/send-receipt', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const resellerId = getResellerId(req);
    const paymentId = req.params.paymentId;
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        bill: { include: { package: true, customer: { include: { user: true } } } },
        customer: { select: { phone: true } },
      },
    });
    if (!payment?.bill) throw new AppError(404, 'Payment not found');
    const billCustomer = (payment as any).bill.customer;
    if (billCustomer?.resellerId !== resellerId) throw new AppError(403, 'Not your customer');
    const phone = (payment as any).customer?.phone ?? billCustomer?.user?.phone;
    if (!phone) throw new AppError(400, 'Customer phone not found');
    const msg = `Receipt: Paid BDT ${payment.amount} (${payment.method}) for ${(payment as any).bill.package?.name ?? 'bill'}. Date: ${new Date(payment.createdAt).toLocaleDateString()}. Thank you.`;
    const { sendSms } = await import('../services/sms.js');
    await sendSms(phone, msg, 'RECEIPT');
    res.json({ ok: true, message: 'Receipt SMS sent.' });
  } catch (e) {
    next(e);
  }
});

export { router as resellerRouter };
