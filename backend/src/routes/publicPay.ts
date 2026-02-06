/**
 * Outside bill payment by payment link – no login required.
 * GET /api/public/pay/:token – bill info for display
 * POST /api/public/pay/:token – submit payment (amount, method, trxId)
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { verifyTransaction } from '../services/paymentGateway.js';

const router = Router();

router.get('/pay/:token', async (req, res, next) => {
  try {
    const token = req.params.token;
    const bill = await prisma.bill.findFirst({
      where: {
        paymentToken: token,
        status: { not: 'PAID' },
        OR: [
          { paymentTokenExpiresAt: null },
          { paymentTokenExpiresAt: { gt: new Date() } },
        ],
      },
      include: {
        customer: { include: { user: { select: { name: true, phone: true } }, package: true } },
        package: true,
        payments: true,
      },
    });
    if (!bill) throw new AppError(404, 'Invalid or expired payment link');
    const paid = bill.payments.reduce((s, p) => s + Number(p.amount), 0);
    const discount = Number((bill as any).discountAmount ?? 0);
    const total = Number(bill.amount) - discount;
    const due = Math.max(0, total - paid);
    res.json({
      billId: bill.id,
      customerName: bill.customer?.user?.name,
      packageName: bill.package?.name,
      amount: Number(bill.amount),
      discountAmount: discount,
      totalDue: total,
      paidSoFar: paid,
      dueNow: due,
      dueDate: bill.dueDate,
    });
  } catch (e) {
    next(e);
  }
});

router.post('/pay/:token', [
  body('amount').isFloat({ min: 0.01 }),
  body('method').isIn(['BKASH', 'NAGAD', 'ROCKET']),
  body('trxId').trim().notEmpty(),
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const token = req.params.token;
    const bill = await prisma.bill.findFirst({
      where: {
        paymentToken: token,
        status: { not: 'PAID' },
        OR: [
          { paymentTokenExpiresAt: null },
          { paymentTokenExpiresAt: { gt: new Date() } },
        ],
      },
      include: { customer: true, package: true },
    });
    if (!bill) throw new AppError(404, 'Invalid or expired payment link');
    const amount = new Prisma.Decimal(req.body.amount);
    const discount = new Prisma.Decimal((bill as any).discountAmount ?? 0);
    const billTotal = Prisma.Decimal.sub(bill.amount, discount);
    const result = await verifyTransaction(req.body.method, req.body.trxId, Number(amount));
    if (!result.verified) throw new AppError(400, result.error || 'Payment verification failed');
    const paidSoFar = await prisma.payment.aggregate({ where: { billId: bill.id }, _sum: { amount: true } });
    const totalPaid = Prisma.Decimal.add(paidSoFar._sum.amount ?? 0, amount);
    const newStatus = totalPaid.gte(billTotal) ? 'PAID' : 'PARTIAL';
    const profile = await prisma.customerProfile.findUnique({
      where: { id: bill.customerId },
      select: { advanceBalance: true },
    });
    let advanceToAdd = new Prisma.Decimal(0);
    if (totalPaid.gt(billTotal)) advanceToAdd = Prisma.Decimal.sub(totalPaid, billTotal);
    const newAdvance = Prisma.Decimal.add(profile?.advanceBalance ?? 0, advanceToAdd);
    const updates: Promise<unknown>[] = [
      prisma.payment.create({
        data: {
          billId: bill.id,
          customerId: bill.customer.userId,
          amount,
          method: req.body.method as any,
          trxId: req.body.trxId,
        },
      }),
      prisma.bill.update({
        where: { id: bill.id },
        data: { status: newStatus, ...(newStatus === 'PAID' && { paidAt: new Date() }) },
      }),
    ];
    if (newStatus === 'PAID' || advanceToAdd.gt(0)) {
      updates.push(prisma.customerProfile.update({
        where: { id: bill.customerId },
        data: {
          ...(newStatus === 'PAID' && { status: 'ACTIVE' }),
          advanceBalance: newAdvance,
        },
      }));
    }
    await prisma.$transaction(updates as any);
    res.json({ ok: true, message: 'Payment recorded.', status: newStatus });
  } catch (e) {
    next(e);
  }
});

export { router as publicPayRouter };
