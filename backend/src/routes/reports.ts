import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, requireAdmin, type AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(authMiddleware);

// Profit/Loss: monthly income vs expense
router.get('/profit-loss', requireAdmin, async (req, res, next) => {
  try {
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    const [income, expenses] = await Promise.all([
      prisma.payment.aggregate({
        where: { createdAt: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
    ]);
    const totalIncome = Number(income._sum.amount ?? 0);
    const totalExpense = Number(expenses._sum.amount ?? 0);
    res.json({
      period: { month, year, start, end },
      totalIncome,
      totalExpense,
      profit: totalIncome - totalExpense,
    });
  } catch (e) {
    next(e);
  }
});

// Expense tracker list
router.get('/expenses', async (req: AuthRequest, res, next) => {
  try {
    const isAdmin = req.user!.role === 'ADMIN';
    const month = req.query.month as string | undefined;
    const year = req.query.year as string | undefined;
    const where: Record<string, unknown> = {};
    if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      where.date = { gte: start, lte: end };
    }
    if (!isAdmin && req.user!.resellerId) where.resellerId = req.user!.resellerId;
    const list = await prisma.expense.findMany({
      where,
      include: { reseller: { include: { user: { select: { name: true } } } } },
      orderBy: { date: 'desc' },
      take: 200,
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/expenses', requireAdmin, async (req, res, next) => {
  try {
    const { category, amount, description, date, resellerId } = req.body;
    if (!category || amount == null) throw new AppError(400, 'category and amount required');
    const exp = await prisma.expense.create({
      data: {
        category: String(category),
        amount,
        description: description || null,
        date: date ? new Date(date) : new Date(),
        resellerId: resellerId || null,
      },
    });
    res.status(201).json(exp);
  } catch (e) {
    next(e);
  }
});

// Collection report: area-wise / reseller-wise
router.get('/collection', requireAdmin, async (req, res, next) => {
  try {
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    const resellers = await prisma.resellerProfile.findMany({
      include: { user: { select: { name: true, phone: true } } },
    });
    const summary = await Promise.all(
      resellers.map(async (r) => {
        const sum = await prisma.payment.aggregate({
          where: {
            bill: { customer: { resellerId: r.id } },
            createdAt: { gte: start, lte: end },
          },
          _sum: { amount: true },
        });
        return { resellerId: r.id, resellerName: r.user.name, area: r.area, totalCollection: Number(sum._sum.amount ?? 0) };
      })
    );
    res.json({ period: { month, year }, summary });
  } catch (e) {
    next(e);
  }
});

export { router as reportsRouter };
