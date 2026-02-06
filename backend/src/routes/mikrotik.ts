import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { syncToMikrotik, blockOnMikrotik, unblockOnMikrotik, testMikrotikConnection, importFromMikrotik } from '../services/mikrotik.js';

const router = Router();
router.use(authMiddleware);
router.use(requireAdmin);

router.post('/sync', async (_req, res, next) => {
  try {
    const result = await syncToMikrotik();
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.post('/import', async (_req, res, next) => {
  try {
    const result = await importFromMikrotik();
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.post('/sync/customer/:customerId', async (req, res, next) => {
  try {
    const profile = await prisma.customerProfile.findUnique({
      where: { id: req.params.customerId },
      include: { package: true },
    });
    if (!profile) throw new AppError(404, 'Customer not found');
    const ok = await syncToMikrotik(profile);
    res.json({ success: ok });
  } catch (e) {
    next(e);
  }
});

router.post('/block/:customerId', async (req, res, next) => {
  try {
    const profile = await prisma.customerProfile.findUnique({
      where: { id: req.params.customerId },
    });
    if (!profile?.username) throw new AppError(404, 'Customer or username not found');
    await blockOnMikrotik(profile.username);
    await prisma.customerProfile.update({
      where: { id: profile.id },
      data: { status: 'BLOCKED' },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post('/unblock/:customerId', async (req, res, next) => {
  try {
    const profile = await prisma.customerProfile.findUnique({
      where: { id: req.params.customerId },
    });
    if (!profile?.username) throw new AppError(404, 'Customer or username not found');
    await unblockOnMikrotik(profile.username);
    await prisma.customerProfile.update({
      where: { id: profile.id },
      data: { status: 'ACTIVE' },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get('/test', async (_req, res, next) => {
  try {
    const result = await testMikrotikConnection();
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message || 'Connection failed' });
  }
});

router.get('/logs', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const logs = await prisma.mikrotikSyncLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    res.json(logs);
  } catch (e) {
    next(e);
  }
});

export { router as mikrotikRouter };
