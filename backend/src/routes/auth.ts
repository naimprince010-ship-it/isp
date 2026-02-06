import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { Role } from '@prisma/client';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

router.post(
  '/register',
  [
    body('phone').trim().notEmpty().withMessage('Phone required'),
    body('password').isLength({ min: 6 }).withMessage('Min 6 chars'),
    body('name').trim().notEmpty().withMessage('Name required'),
    body('role').isIn(['RESELLER', 'CUSTOMER']).withMessage('Invalid role'),
    body('email').optional().isEmail(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
      const { phone, password, name, role, email } = req.body;
      const existing = await prisma.user.findUnique({ where: { phone } });
      if (existing) throw new AppError(400, 'Phone already registered');
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          phone,
          email: email || null,
          passwordHash,
          name,
          role: role as Role,
        },
        select: { id: true, phone: true, name: true, role: true, email: true },
      });
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
      );
      res.status(201).json({ user, token });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  '/login',
  [
    body('phone').trim().notEmpty(),
    body('password').notEmpty(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new AppError(400, 'Phone and password required');
      const { phone, password } = req.body;
      const user = await prisma.user.findUnique({
        where: { phone },
        include: {
          resellerProfile: true,
          customerProfile: { include: { package: true, reseller: true } },
        },
      });
      if (!user || !user.isActive) throw new AppError(401, 'Invalid credentials');
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) throw new AppError(401, 'Invalid credentials');
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
      );
      const payload = {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        resellerProfile: user.resellerProfile,
        customerProfile: user.customerProfile,
      };
      res.json({ user: payload, token });
    } catch (e) {
      next(e);
    }
  }
);

router.get('/me', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        resellerProfile: true,
        customerProfile: { include: { package: true, reseller: true } },
      },
    });
    if (!user) throw new AppError(404, 'User not found');
    res.json(user);
  } catch (e) {
    next(e);
  }
});

export { router as authRouter };
