import { Router, type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, requireAdmin, type AuthRequest } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// Public: list active packages (for customer signup / reseller)
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const packages = await prisma.package.findMany({
      where: { isActive: true },
      orderBy: { speedMbps: 'asc' },
    });
    res.json(packages);
  } catch (e) {
    next(e);
  }
});

// Admin: CRUD packages
router.use(authMiddleware);
router.use(requireAdmin);

router.post(
  '/',
  [
    body('name').trim().notEmpty(),
    body('speedMbps').isInt({ min: 1 }),
    body('price').isFloat({ min: 0 }),
    body('validityDays').optional().isInt({ min: 1 }).toInt(),
    body('description').optional().trim(),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
      const pkg = await prisma.package.create({
        data: {
          name: req.body.name,
          speedMbps: req.body.speedMbps,
          price: req.body.price,
          validityDays: req.body.validityDays ?? 30,
          description: req.body.description || null,
        },
      });
      res.status(201).json(pkg);
    } catch (e) {
      next(e);
    }
  }
);

router.patch('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const pkg = await prisma.package.update({
      where: { id: req.params.id },
      data: {
        ...(req.body.name != null && { name: req.body.name }),
        ...(req.body.speedMbps != null && { speedMbps: req.body.speedMbps }),
        ...(req.body.price != null && { price: req.body.price }),
        ...(req.body.validityDays != null && { validityDays: req.body.validityDays }),
        ...(req.body.description != null && { description: req.body.description }),
        ...(req.body.isActive != null && { isActive: req.body.isActive }),
      },
    });
    res.json(pkg);
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.package.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export { router as packagesRouter };
