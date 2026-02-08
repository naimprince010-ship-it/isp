import { Router, type Response, type NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, requireAdmin, type AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(authMiddleware);
router.use(requireAdmin);

// Asset list (active only or all)
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string | undefined;
    const where: Prisma.AssetWhereInput = status ? { status } : {};
    const list = await prisma.asset.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/', [
  body('name').trim().notEmpty(),
  body('category').isIn(['EQUIPMENT', 'FURNITURE', 'VEHICLE', 'ELECTRONICS', 'OTHER']),
  body('purchaseDate').optional(),
  body('value').optional().isFloat({ min: 0 }),
  body('location').optional().trim(),
  body('notes').optional().trim(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const asset = await prisma.asset.create({
      data: {
        name: req.body.name.trim(),
        category: req.body.category,
        purchaseDate: req.body.purchaseDate ? new Date(req.body.purchaseDate) : null,
        value: req.body.value != null ? new Prisma.Decimal(req.body.value) : null,
        location: req.body.location?.trim() || null,
        notes: req.body.notes?.trim() || null,
      },
    });
    res.status(201).json(asset);
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', [
  body('name').optional().trim().notEmpty(),
  body('category').optional().isIn(['EQUIPMENT', 'FURNITURE', 'VEHICLE', 'ELECTRONICS', 'OTHER']),
  body('purchaseDate').optional(),
  body('value').optional().isFloat({ min: 0 }),
  body('location').optional().trim(),
  body('notes').optional().trim(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const data: Record<string, unknown> = {};
    if (req.body.name !== undefined) data.name = req.body.name.trim();
    if (req.body.category !== undefined) data.category = req.body.category;
    if (req.body.purchaseDate !== undefined) data.purchaseDate = req.body.purchaseDate ? new Date(req.body.purchaseDate) : null;
    if (req.body.value !== undefined) data.value = req.body.value != null ? new Prisma.Decimal(req.body.value) : null;
    if (req.body.location !== undefined) data.location = req.body.location?.trim() || null;
    if (req.body.notes !== undefined) data.notes = req.body.notes?.trim() || null;
    const asset = await prisma.asset.update({ where: { id: req.params.id }, data });
    res.json(asset);
  } catch (e) {
    next(e);
  }
});

// Mark as destroyed (save to destroyed list - status = DESTROYED)
router.patch('/:id/destroy', [
  body('destroyReason').optional().trim(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const asset = await prisma.asset.update({
      where: { id: req.params.id },
      data: {
        status: 'DESTROYED',
        destroyedDate: new Date(),
        destroyReason: req.body.destroyReason?.trim() || null,
      },
    });
    res.json(asset);
  } catch (e) {
    next(e);
  }
});

// Destroyed items list
router.get('/destroyed', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const list = await prisma.asset.findMany({
      where: { status: 'DESTROYED' },
      orderBy: { destroyedDate: 'desc' },
      take: 200,
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

export { router as assetsRouter };
