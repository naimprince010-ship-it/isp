import { Router, type Response, type NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, requireRole, type AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);
router.use(requireRole('ADMIN', 'RESELLER', 'EMPLOYEE'));

// Network diagram data: POPs (resellers), clients, connections, inventory by location
router.get('/diagram', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const resellerFilter = req.user?.role === 'RESELLER' && req.user?.resellerId
      ? { resellerId: req.user.resellerId }
      : {};

    const [resellers, customers, inventory] = await Promise.all([
      prisma.resellerProfile.findMany({
        where: req.user?.role === 'RESELLER' ? { id: req.user.resellerId! } : {},
        include: {
          user: { select: { name: true, phone: true } },
          _count: { select: { customers: true } },
        },
      }),
      prisma.customerProfile.findMany({
        where: resellerFilter,
        include: {
          user: { select: { name: true, phone: true } },
          reseller: { select: { id: true, area: true, companyName: true } },
          package: { select: { name: true, speedMbps: true } },
        },
      }),
      prisma.inventoryItem.findMany({ orderBy: { location: 'asc' } }),
    ]);

    const pops = resellers.map((r) => ({
      id: r.id,
      name: r.companyName || r.area || r.user?.name || 'Unnamed POP',
      area: r.area,
      address: r.address,
      customerCount: r._count.customers,
      companyName: r.companyName,
    }));

    const clients = customers.map((c) => ({
      id: c.id,
      name: c.user?.name,
      phone: c.user?.phone,
      status: c.status,
      zoneArea: c.zoneArea,
      address: c.address,
      packageName: c.package?.name,
      speedMbps: c.package?.speedMbps,
      resellerId: c.resellerId,
      resellerName: c.reseller?.companyName || c.reseller?.area,
    }));

    const connections = clients.map((c) => ({
      clientId: c.id,
      popId: c.resellerId,
      clientName: c.name,
      popName: c.resellerName,
    }));

    const inventoryByLocation = inventory.reduce((acc: Record<string, typeof inventory>, item) => {
      const loc = item.location || 'Unassigned';
      if (!acc[loc]) acc[loc] = [];
      acc[loc].push(item);
      return acc;
    }, {});

    res.json({
      pops,
      clients,
      connections,
      inventoryByLocation: Object.entries(inventoryByLocation).map(([location, items]) => ({
        location,
        items: items.map((i) => ({
          id: i.id,
          type: i.type,
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          minStock: i.minStock,
        })),
      })),
      inventory,
    });
  } catch (e) {
    next(e);
  }
});

export { router as networkRouter };
