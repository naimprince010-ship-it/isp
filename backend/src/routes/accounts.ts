import { Router, type Response, type NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, requireAdmin, type AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(authMiddleware);
router.use(requireAdmin);

// Accounts (Cash, Bank)
router.get('/accounts', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const list = await prisma.account.findMany({
      where: { isActive: true },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.get('/accounts/all', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const list = await prisma.account.findMany({ orderBy: [{ type: 'asc' }, { name: 'asc' }] });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/accounts', [
  body('name').trim().notEmpty(),
  body('type').isIn(['CASH', 'BANK']),
  body('openingBalance').optional().isFloat(),
  body('notes').optional().trim(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const account = await prisma.account.create({
      data: {
        name: req.body.name.trim(),
        type: req.body.type,
        openingBalance: new Prisma.Decimal(req.body.openingBalance ?? 0),
        notes: req.body.notes?.trim() || null,
      },
    });
    res.status(201).json(account);
  } catch (e) {
    next(e);
  }
});

router.patch('/accounts/:id', [
  body('name').optional().trim().notEmpty(),
  body('openingBalance').optional().isFloat(),
  body('notes').optional().trim(),
  body('isActive').optional().isBoolean(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const data: Record<string, unknown> = {};
    if (req.body.name !== undefined) data.name = req.body.name.trim();
    if (req.body.openingBalance !== undefined) data.openingBalance = new Prisma.Decimal(req.body.openingBalance);
    if (req.body.notes !== undefined) data.notes = req.body.notes?.trim() || null;
    if (req.body.isActive !== undefined) data.isActive = req.body.isActive;
    const account = await prisma.account.update({ where: { id: req.params.id }, data });
    res.json(account);
  } catch (e) {
    next(e);
  }
});

// Transaction Categories (Income, Expense)
router.get('/categories', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const type = req.query.type as string | undefined;
    const where = type ? { type, isActive: true } : { isActive: true };
    const list = await prisma.transactionCategory.findMany({ where, orderBy: [{ type: 'asc' }, { name: 'asc' }] });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/categories', [
  body('name').trim().notEmpty(),
  body('type').isIn(['INCOME', 'EXPENSE']),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const cat = await prisma.transactionCategory.create({
      data: { name: req.body.name.trim(), type: req.body.type },
    });
    res.status(201).json(cat);
  } catch (e) {
    next(e);
  }
});

// Financial Transactions
router.get('/transactions', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const type = req.query.type as string | undefined;
    const accountId = req.query.accountId as string | undefined;

    const where: Prisma.FinancialTransactionWhereInput = {};
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      where.date = { gte: start, lte: end };
    }
    if (type) where.type = type;
    if (accountId) where.OR = [{ accountId }, { transferToAccountId: accountId }];

    const list = await prisma.financialTransaction.findMany({
      where,
      include: { category: true, account: true, transferToAccount: true },
      orderBy: { date: 'desc' },
      take: 200,
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/transactions', [
  body('date').notEmpty(),
  body('type').isIn(['INCOME', 'EXPENSE', 'TRANSFER']),
  body('accountId').trim().notEmpty(),
  body('amount').isFloat({ min: 0.01 }),
  body('categoryId').optional().trim(),
  body('transferToAccountId').optional().trim(),
  body('description').optional().trim(),
  body('voucherNo').optional().trim(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const { type, accountId, transferToAccountId } = req.body;
    if (type === 'TRANSFER' && !transferToAccountId) throw new AppError(400, 'Transfer requires transferToAccountId');
    if (type !== 'TRANSFER' && transferToAccountId) throw new AppError(400, 'transferToAccountId only for TRANSFER');

    const tx = await prisma.financialTransaction.create({
      data: {
        date: new Date(req.body.date),
        type: req.body.type,
        categoryId: req.body.categoryId || null,
        accountId: req.body.accountId,
        transferToAccountId: req.body.transferToAccountId || null,
        amount: new Prisma.Decimal(req.body.amount),
        description: req.body.description?.trim() || null,
        voucherNo: req.body.voucherNo?.trim() || null,
        createdById: req.user!.id,
      },
      include: { category: true, account: true, transferToAccount: true },
    });
    res.status(201).json(tx);
  } catch (e) {
    next(e);
  }
});

// Summary: balances, profit/loss, balance sheet
router.get('/summary', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const month = req.query.month ? parseInt(req.query.month as string, 10) : new Date().getMonth() + 1;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const accounts = await prisma.account.findMany({ where: { isActive: true } });
    const transactions = await prisma.financialTransaction.findMany({
      where: { date: { lte: end } },
      include: { account: true, transferToAccount: true },
    });

    const balances: Record<string, number> = {};
    for (const acc of accounts) {
      let bal = Number(acc.openingBalance);
      for (const t of transactions) {
        if (t.accountId === acc.id) {
          if (t.type === 'INCOME') bal += Number(t.amount);
          else if (t.type === 'EXPENSE') bal -= Number(t.amount);
          else if (t.type === 'TRANSFER' && t.transferToAccountId) bal -= Number(t.amount);
        }
        if (t.transferToAccountId === acc.id) bal += Number(t.amount);
      }
      balances[acc.id] = bal;
    }

    const monthTx = transactions.filter((t) => t.date >= start && t.date <= end);
    let totalIncome = 0;
    let totalExpense = 0;
    for (const t of monthTx) {
      if (t.type === 'INCOME') totalIncome += Number(t.amount);
      else if (t.type === 'EXPENSE') totalExpense += Number(t.amount);
    }
    const profitLoss = totalIncome - totalExpense;
    const totalCash = accounts.filter((a) => a.type === 'CASH').reduce((s, a) => s + (balances[a.id] ?? 0), 0);
    const totalBank = accounts.filter((a) => a.type === 'BANK').reduce((s, a) => s + (balances[a.id] ?? 0), 0);

    res.json({
      month,
      year,
      accounts: accounts.map((a) => ({ ...a, balance: balances[a.id] ?? 0 })),
      totalCash,
      totalBank,
      totalIncome,
      totalExpense,
      profitLoss,
      transactions: monthTx.length,
    });
  } catch (e) {
    next(e);
  }
});

// Balance sheet for print
router.get('/balance-sheet', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const month = req.query.month ? parseInt(req.query.month as string, 10) : new Date().getMonth() + 1;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
    const end = new Date(year, month, 0, 23, 59, 59);

    const accounts = await prisma.account.findMany({ where: { isActive: true } });
    const transactions = await prisma.financialTransaction.findMany({
      where: { date: { lte: end } },
    });

    const balances: Record<string, number> = {};
    for (const acc of accounts) {
      let bal = Number(acc.openingBalance);
      for (const t of transactions) {
        if (t.accountId === acc.id) {
          if (t.type === 'INCOME') bal += Number(t.amount);
          else if (t.type === 'EXPENSE') bal -= Number(t.amount);
          else if (t.type === 'TRANSFER' && t.transferToAccountId) bal -= Number(t.amount);
        }
        if (t.transferToAccountId === acc.id) bal += Number(t.amount);
      }
      balances[acc.id] = bal;
    }

    const cashAccounts = accounts.filter((a) => a.type === 'CASH').map((a) => ({ ...a, balance: balances[a.id] ?? 0 }));
    const bankAccounts = accounts.filter((a) => a.type === 'BANK').map((a) => ({ ...a, balance: balances[a.id] ?? 0 }));
    const totalAssets = [...cashAccounts, ...bankAccounts].reduce((s, a) => s + a.balance, 0);

    res.json({
      month,
      year,
      asOf: end.toISOString(),
      cashAccounts,
      bankAccounts,
      totalCash: cashAccounts.reduce((s, a) => s + a.balance, 0),
      totalBank: bankAccounts.reduce((s, a) => s + a.balance, 0),
      totalAssets,
    });
  } catch (e) {
    next(e);
  }
});

export { router as accountsRouter };
