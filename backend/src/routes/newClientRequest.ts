import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// Public: submit new client request (no auth)
router.post(
  '/',
  [
    body('name').trim().notEmpty(),
    body('phone').trim().notEmpty(),
    body('address').optional().trim(),
    body('packageId').optional().trim(),
    body('resellerId').optional().trim(),
    body('connectionType').isIn(['PPPoE', 'Static']),
    body('requestedUsername').optional().trim(),
    body('requestedStaticIp').optional().trim(),
    body('notes').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
      const data = {
        name: req.body.name,
        phone: req.body.phone,
        address: req.body.address || null,
        packageId: req.body.packageId || null,
        resellerId: req.body.resellerId || null,
        connectionType: req.body.connectionType,
        requestedUsername: req.body.requestedUsername || null,
        requestedStaticIp: req.body.requestedStaticIp || null,
        notes: req.body.notes || null,
        status: 'PENDING',
      };
      const created = await prisma.newClientRequest.create({ data });
      res.status(201).json({ id: created.id, message: 'Request submitted. Admin will review.' });
    } catch (e) {
      next(e);
    }
  }
);

export { router as newClientRequestRouter };
