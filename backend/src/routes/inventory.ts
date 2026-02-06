import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(authMiddleware);
router.use(requireAdmin);

router.get('/', async (_req, res, next) => {
  try {
    const items = await prisma.inventoryItem.findMany({ orderBy: { type: 'asc' } });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

router.post('/', [body('type').isIn(['ROUTER', 'ONU', 'MC', 'FIBER_CABLE', 'OTHER']), body('name').trim().notEmpty()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const item = await prisma.inventoryItem.create({
      data: {
        type: req.body.type,
        name: req.body.name,
        quantity: req.body.quantity ?? 0,
        unit: req.body.unit ?? 'pcs',
        minStock: req.body.minStock ?? 0,
        location: req.body.location || null,
      },
    });
    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const item = await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data: {
        ...(req.body.name != null && { name: req.body.name }),
        ...(req.body.quantity != null && { quantity: req.body.quantity }),
        ...(req.body.unit != null && { unit: req.body.unit }),
        ...(req.body.minStock != null && { minStock: req.body.minStock }),
        ...(req.body.location != null && { location: req.body.location }),
      },
    });
    res.json(item);
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.inventoryItem.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export { router as inventoryRouter };
