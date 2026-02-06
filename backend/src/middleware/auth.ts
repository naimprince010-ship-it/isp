import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { AppError } from './errorHandler.js';
import type { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export interface JwtPayload {
  userId: string;
  role: Role;
  email?: string;
}

export interface AuthRequest extends Request {
  user?: { id: string; role: Role; email?: string; resellerId?: string };
}

export async function authMiddleware(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError(401, 'Unauthorized');
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { resellerProfile: true },
    });
    if (!user || !user.isActive) throw new AppError(401, 'Unauthorized');
    req.user = {
      id: user.id,
      role: user.role,
      email: user.email ?? undefined,
      resellerId: user.resellerProfile?.id,
    };
    next();
  } catch {
    throw new AppError(401, 'Invalid or expired token');
  }
}

export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, 'Unauthorized'));
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'Forbidden'));
    }
    next();
  };
}

export function requireAdmin(req: AuthRequest, _res: Response, next: NextFunction) {
  return requireRole('ADMIN')(req, _res, next);
}

export function requireReseller(req: AuthRequest, _res: Response, next: NextFunction) {
  return requireRole('RESELLER')(req, _res, next);
}

export function requireCustomer(req: AuthRequest, _res: Response, next: NextFunction) {
  return requireRole('CUSTOMER')(req, _res, next);
}
