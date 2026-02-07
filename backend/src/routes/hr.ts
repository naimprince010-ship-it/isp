import { Router, type Response, type NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, requireAdmin, type AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import type { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const router = Router();
router.use(authMiddleware);
router.use(requireAdmin);

// Departments
router.get('/departments', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const list = await prisma.department.findMany({ orderBy: { name: 'asc' } });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/departments', [
  body('name').trim().notEmpty(),
  body('description').optional().trim(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const d = await prisma.department.create({
      data: { name: req.body.name.trim(), description: req.body.description || null },
    });
    res.status(201).json(d);
  } catch (e) {
    next(e);
  }
});

router.patch('/departments/:id', [
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('isActive').optional().isBoolean(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const data: Record<string, unknown> = {};
    if (req.body.name != null) data.name = req.body.name.trim();
    if (req.body.description != null) data.description = req.body.description;
    if (req.body.isActive != null) data.isActive = req.body.isActive;
    const d = await prisma.department.update({ where: { id: req.params.id }, data: data as any });
    res.json(d);
  } catch (e) {
    next(e);
  }
});

// Designations
router.get('/designations', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const list = await prisma.designation.findMany({
      include: { department: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/designations', [
  body('name').trim().notEmpty(),
  body('departmentId').optional().trim(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const d = await prisma.designation.create({
      data: { name: req.body.name.trim(), departmentId: req.body.departmentId || null },
    });
    res.status(201).json(d);
  } catch (e) {
    next(e);
  }
});

router.patch('/designations/:id', [
  body('name').optional().trim().notEmpty(),
  body('departmentId').optional().trim(),
  body('isActive').optional().isBoolean(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const data: Record<string, unknown> = {};
    if (req.body.name != null) data.name = req.body.name.trim();
    if (req.body.departmentId != null) data.departmentId = req.body.departmentId || null;
    if (req.body.isActive != null) data.isActive = req.body.isActive;
    const d = await prisma.designation.update({ where: { id: req.params.id }, data: data as any });
    res.json(d);
  } catch (e) {
    next(e);
  }
});

// Employees (User + EmployeeProfile)
router.get('/employees', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const list = await prisma.employeeProfile.findMany({
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
        department: { select: { id: true, name: true } },
        designation: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

// Link existing User (EMPLOYEE) to EmployeeProfile
router.post('/employees/link-user', [
  body('userId').trim().notEmpty(),
  body('departmentId').optional().trim(),
  body('designationId').optional().trim(),
  body('employeeCode').optional().trim(),
  body('joinDate').isISO8601(),
  body('basicSalary').optional().isFloat({ min: 0 }),
  body('bankAccount').optional().trim(),
  body('nid').optional().trim(),
  body('address').optional().trim(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const user = await prisma.user.findUnique({ where: { id: req.body.userId } });
    if (!user || user.role !== 'EMPLOYEE') throw new AppError(400, 'User not found or not an employee');
    const existing = await prisma.employeeProfile.findUnique({ where: { userId: user.id } });
    if (existing) throw new AppError(400, 'Employee already has HR profile');
    const profile = await prisma.employeeProfile.create({
      data: {
        userId: user.id,
        departmentId: req.body.departmentId || null,
        designationId: req.body.designationId || null,
        employeeCode: req.body.employeeCode || null,
        joinDate: new Date(req.body.joinDate),
        basicSalary: req.body.basicSalary ?? 0,
        bankAccount: req.body.bankAccount || null,
        nid: req.body.nid || null,
        address: req.body.address || null,
      },
      include: { user: true, department: true, designation: true },
    });
    res.status(201).json(profile);
  } catch (e) {
    next(e);
  }
});

router.post('/employees', [
  body('phone').trim().notEmpty(),
  body('password').isLength({ min: 6 }),
  body('name').trim().notEmpty(),
  body('departmentId').optional().trim(),
  body('designationId').optional().trim(),
  body('employeeCode').optional().trim(),
  body('joinDate').isISO8601(),
  body('basicSalary').optional().isFloat({ min: 0 }),
  body('bankAccount').optional().trim(),
  body('nid').optional().trim(),
  body('address').optional().trim(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const existing = await prisma.user.findUnique({ where: { phone: req.body.phone } });
    if (existing) throw new AppError(400, 'Phone already registered');
    const passwordHash = await bcrypt.hash(req.body.password, 10);
    const user = await prisma.user.create({
      data: {
        phone: req.body.phone.trim(),
        passwordHash,
        name: req.body.name.trim(),
        role: 'EMPLOYEE' as Role,
      },
    });
    const profile = await prisma.employeeProfile.create({
      data: {
        userId: user.id,
        departmentId: req.body.departmentId || null,
        designationId: req.body.designationId || null,
        employeeCode: req.body.employeeCode || null,
        joinDate: new Date(req.body.joinDate),
        basicSalary: req.body.basicSalary ?? 0,
        bankAccount: req.body.bankAccount || null,
        nid: req.body.nid || null,
        address: req.body.address || null,
      },
      include: { user: true, department: true, designation: true },
    });
    res.status(201).json(profile);
  } catch (e) {
    next(e);
  }
});

router.get('/employees/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await prisma.employeeProfile.findUnique({
      where: { id: req.params.id },
      include: {
        user: true,
        department: true,
        designation: true,
        salaries: { orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 24 },
        appraisals: { orderBy: { periodTo: 'desc' }, take: 10 },
      },
    });
    if (!profile) throw new AppError(404, 'Employee not found');
    res.json(profile);
  } catch (e) {
    next(e);
  }
});

router.patch('/employees/:id', [
  body('departmentId').optional().trim(),
  body('designationId').optional().trim(),
  body('employeeCode').optional().trim(),
  body('basicSalary').optional().isFloat({ min: 0 }),
  body('bankAccount').optional().trim(),
  body('nid').optional().trim(),
  body('address').optional().trim(),
  body('isActive').optional().isBoolean(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const data: Record<string, unknown> = {};
    if (req.body.departmentId != null) data.departmentId = req.body.departmentId || null;
    if (req.body.designationId != null) data.designationId = req.body.designationId || null;
    if (req.body.employeeCode != null) data.employeeCode = req.body.employeeCode || null;
    if (req.body.basicSalary != null) data.basicSalary = req.body.basicSalary;
    if (req.body.bankAccount != null) data.bankAccount = req.body.bankAccount || null;
    if (req.body.nid != null) data.nid = req.body.nid || null;
    if (req.body.address != null) data.address = req.body.address || null;
    if (req.body.isActive != null) data.isActive = req.body.isActive;
    const p = await prisma.employeeProfile.update({
      where: { id: req.params.id },
      data: data as any,
      include: { user: true, department: true, designation: true },
    });
    res.json(p);
  } catch (e) {
    next(e);
  }
});

// Salary
router.get('/salaries', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const month = req.query.month ? parseInt(req.query.month as string) : new Date().getMonth() + 1;
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    const list = await prisma.salary.findMany({
      where: { month, year },
      include: {
        employee: { include: { user: { select: { name: true, phone: true } }, department: true, designation: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/salaries/generate', [
  body('month').isInt({ min: 1, max: 12 }),
  body('year').isInt({ min: 2020, max: 2030 }),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const { month, year } = req.body;
    const employees = await prisma.employeeProfile.findMany({ where: { isActive: true }, include: { user: true } });
    const created: unknown[] = [];
    for (const emp of employees) {
      const existing = await prisma.salary.findUnique({
        where: { employeeId_month_year: { employeeId: emp.id, month, year } },
      });
      if (!existing) {
        const sal = await prisma.salary.create({
          data: {
            employeeId: emp.id,
            month,
            year,
            baseAmount: emp.basicSalary,
            netAmount: emp.basicSalary,
          },
          include: { employee: { include: { user: true } } },
        });
        created.push(sal);
      }
    }
    res.status(201).json({ generated: created.length, salaries: created });
  } catch (e) {
    next(e);
  }
});

router.patch('/salaries/:id', [
  body('bonus').optional().isFloat({ min: 0 }),
  body('overtime').optional().isFloat({ min: 0 }),
  body('incentive').optional().isFloat({ min: 0 }),
  body('deductions').optional().isFloat({ min: 0 }),
  body('notes').optional().trim(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const sal = await prisma.salary.findUnique({ where: { id: req.params.id } });
    if (!sal) throw new AppError(404, 'Salary not found');
    const bonus = req.body.bonus != null ? req.body.bonus : Number(sal.bonus);
    const overtime = req.body.overtime != null ? req.body.overtime : Number(sal.overtime);
    const incentive = req.body.incentive != null ? req.body.incentive : Number(sal.incentive);
    const deductions = req.body.deductions != null ? req.body.deductions : Number(sal.deductions);
    const netAmount = Number(sal.baseAmount) + bonus + overtime + incentive - deductions;
    const updated = await prisma.salary.update({
      where: { id: req.params.id },
      data: {
        bonus,
        overtime,
        incentive,
        deductions,
        netAmount,
        notes: req.body.notes != null ? req.body.notes : sal.notes,
      },
      include: { employee: { include: { user: true } } },
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

router.patch('/salaries/:id/pay', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const updated = await prisma.salary.update({
      where: { id: req.params.id },
      data: { status: 'PAID', paidAt: new Date() },
      include: { employee: { include: { user: true } } },
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// Attendance
router.get('/attendance', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const month = req.query.month ? parseInt(req.query.month as string) : new Date().getMonth() + 1;
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    const employeeId = req.query.employeeId as string | undefined;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    const where: any = { date: { gte: start, lte: end } };
    if (employeeId) where.employeeId = employeeId;
    const list = await prisma.attendance.findMany({
      where,
      include: { employee: { include: { user: { select: { name: true, phone: true } } } } },
      orderBy: { date: 'desc' },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/attendance', [
  body('employeeId').trim().notEmpty(),
  body('date').isISO8601(),
  body('checkIn').optional(),
  body('checkOut').optional(),
  body('status').optional().isIn(['PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY', 'LATE']),
  body('notes').optional().trim(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const date = new Date(req.body.date);
    date.setHours(0, 0, 0, 0);
    const att = await prisma.attendance.upsert({
      where: {
        employeeId_date: { employeeId: req.body.employeeId, date },
      },
      create: {
        employeeId: req.body.employeeId,
        date,
        checkIn: req.body.checkIn ? new Date(req.body.checkIn) : null,
        checkOut: req.body.checkOut ? new Date(req.body.checkOut) : null,
        status: req.body.status || 'PRESENT',
        notes: req.body.notes || null,
      },
      update: {
        checkIn: req.body.checkIn ? new Date(req.body.checkIn) : undefined,
        checkOut: req.body.checkOut ? new Date(req.body.checkOut) : undefined,
        status: req.body.status || undefined,
        notes: req.body.notes !== undefined ? req.body.notes : undefined,
      },
      include: { employee: { include: { user: true } } },
    });
    res.status(201).json(att);
  } catch (e) {
    next(e);
  }
});

// Performance Appraisal
router.get('/appraisals', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const employeeId = req.query.employeeId as string | undefined;
    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    const list = await prisma.performanceAppraisal.findMany({
      where,
      include: { employee: { include: { user: { select: { name: true, phone: true } } } } },
      orderBy: { periodTo: 'desc' },
      take: 50,
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/appraisals', [
  body('employeeId').trim().notEmpty(),
  body('periodFrom').isISO8601(),
  body('periodTo').isISO8601(),
  body('rating').isFloat({ min: 0, max: 100 }),
  body('comments').optional().trim(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);
    const a = await prisma.performanceAppraisal.create({
      data: {
        employeeId: req.body.employeeId,
        periodFrom: new Date(req.body.periodFrom),
        periodTo: new Date(req.body.periodTo),
        rating: req.body.rating,
        comments: req.body.comments || null,
        reviewedBy: req.user!.id,
      },
      include: { employee: { include: { user: true } } },
    });
    res.status(201).json(a);
  } catch (e) {
    next(e);
  }
});

export { router as hrRouter };
