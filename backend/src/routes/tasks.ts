import { Router, type Response, type NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(authMiddleware);

// List tasks - filter by date, status; Admin sees all, others see own/assigned
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const date = req.query.date as string | undefined;
    const status = req.query.status as string | undefined;
    const history = req.query.history === 'true'; // past/completed tasks
    const where: any = {};
    if (req.user!.role !== 'ADMIN') {
      where.OR = [{ createdById: req.user!.id }, { assignedToId: req.user!.id }];
    }
    if (status) where.status = status;
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setDate(end.getDate() + 1);
      if (history) {
        where.dueDate = { lt: d };
      } else {
        where.dueDate = { gte: d, lt: end };
      }
    } else if (history) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.dueDate = { lt: today };
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      where.dueDate = { gte: today, lt: tomorrow };
    }
    const list = await prisma.task.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true, phone: true } },
        assignedTo: { select: { id: true, name: true, phone: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

// Create task
router.post('/', [
  body('title').trim().notEmpty(),
  body('description').optional().trim(),
  body('dueDate').isISO8601(),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH']),
  body('assignedToId').optional().trim(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const t = await prisma.task.create({
      data: {
        title: req.body.title.trim(),
        description: req.body.description || null,
        dueDate: new Date(req.body.dueDate),
        priority: req.body.priority || null,
        createdById: req.user!.id,
        assignedToId: req.body.assignedToId || null,
      },
      include: { createdBy: { select: { name: true } }, assignedTo: { select: { name: true } } },
    });
    res.status(201).json(t);
  } catch (e) {
    next(e);
  }
});

// Update task
router.patch('/:id', [
  body('title').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('dueDate').optional().isISO8601(),
  body('status').optional().isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH']),
  body('assignedToId').optional().trim(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const id = req.params.id;
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) throw new AppError(404, 'Task not found');
    if (req.user!.role !== 'ADMIN' && task.createdById !== req.user!.id && task.assignedToId !== req.user!.id) {
      throw new AppError(403, 'Not authorized to update this task');
    }
    const data: any = {};
    if (req.body.title != null) data.title = req.body.title.trim();
    if (req.body.description != null) data.description = req.body.description;
    if (req.body.dueDate != null) data.dueDate = new Date(req.body.dueDate);
    if (req.body.status != null) {
      data.status = req.body.status;
      if (req.body.status === 'COMPLETED') data.completedAt = new Date();
    }
    if (req.body.priority != null) data.priority = req.body.priority;
    if (req.body.assignedToId !== undefined) data.assignedToId = req.body.assignedToId || null;
    const updated = await prisma.task.update({
      where: { id },
      data,
      include: { createdBy: { select: { name: true } }, assignedTo: { select: { name: true } } },
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// Delete task
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) throw new AppError(404, 'Task not found');
    if (req.user!.role !== 'ADMIN' && task.createdById !== req.user!.id) {
      throw new AppError(403, 'Not authorized to delete this task');
    }
    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export { router as tasksRouter };
