import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, requireCustomer, requireAdmin, type AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(authMiddleware);

// Customer: create ticket
router.post('/', requireCustomer, [body('subject').trim().notEmpty(), body('description').trim().notEmpty()], async (req: AuthRequest, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const ticket = await prisma.ticket.create({
      data: {
        customerId: req.user!.id,
        subject: req.body.subject,
        description: req.body.description,
        priority: req.body.priority || 'NORMAL',
      },
    });
    res.status(201).json(ticket);
  } catch (e) {
    next(e);
  }
});

// Customer: my tickets
router.get('/my', requireCustomer, async (req: AuthRequest, res, next) => {
  try {
    const list = await prisma.ticket.findMany({
      where: { customerId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

// Admin: all tickets
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const list = await prisma.ticket.findMany({
      include: { customer: { select: { name: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

// Admin: update ticket status
router.patch('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) throw new AppError(400, 'Invalid status');
    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { status, ...(status === 'RESOLVED' && { resolvedAt: new Date() }) },
    });
    res.json(ticket);
  } catch (e) {
    next(e);
  }
});

export { router as ticketsRouter };
