import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { sendSms } from '../services/sms.js';

const router = Router();
router.use(authMiddleware);
router.use(requireAdmin);

router.post('/send', [body('phone').trim().notEmpty(), body('message').trim().notEmpty(), body('purpose').optional().trim()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const result = await sendSms(req.body.phone, req.body.message, req.body.purpose || 'MANUAL');
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.get('/logs', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const logs = await prisma.smsLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    res.json(logs);
  } catch (e) {
    next(e);
  }
});

export { router as smsRouter };
