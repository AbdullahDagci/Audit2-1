import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { qs } from '../utils/query';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const facilityType = qs(req.query.facilityType);
    const active = qs(req.query.active);
    const where: any = {};
    if (facilityType) where.facilityType = facilityType;
    if (active !== undefined) where.isActive = active === 'true';
    // RBAC: Müdür sadece kendi şubelerini görsün
    if (req.userRole === 'manager') {
      where.managerId = req.userId;
    }

    const branches = await prisma.branch.findMany({
      where,
      include: { manager: { select: { id: true, fullName: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(branches);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const branch = await prisma.branch.findUnique({
      where: { id: req.params.id as string },
      include: {
        manager: { select: { id: true, fullName: true } },
        inspections: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: { id: true, scorePercentage: true, status: true, createdAt: true },
        },
      },
    });
    if (!branch) return res.status(404).json({ error: 'Şube bulunamadı' });
    // Erişim kontrolü
    if (req.userRole === 'manager' && branch.managerId !== req.userId) {
      return res.status(403).json({ error: 'Bu şubeye erişim yetkiniz yok' });
    }
    if (req.userRole === 'inspector') {
      const hasAccess = await prisma.inspection.count({ where: { branchId: branch.id, inspectorId: req.userId } });
      if (hasAccess === 0) return res.status(403).json({ error: 'Bu şubeye erişim yetkiniz yok' });
    }
    res.json(branch);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, facilityType, address, city, latitude, longitude, geofenceRadiusMeters, managerId } = req.body;
    if (!name || !facilityType) {
      return res.status(400).json({ error: 'Şube adı ve tesis tipi gerekli' });
    }
    const branch = await prisma.branch.create({
      data: { name, facilityType, address, city, latitude, longitude, geofenceRadiusMeters, managerId },
    });
    res.status(201).json(branch);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, facilityType, address, city, latitude, longitude, geofenceRadiusMeters, managerId, isActive } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (facilityType !== undefined) data.facilityType = facilityType;
    if (address !== undefined) data.address = address;
    if (city !== undefined) data.city = city;
    if (latitude !== undefined) data.latitude = latitude;
    if (longitude !== undefined) data.longitude = longitude;
    if (geofenceRadiusMeters !== undefined) data.geofenceRadiusMeters = geofenceRadiusMeters;
    if (managerId !== undefined) data.managerId = managerId;
    if (isActive !== undefined) data.isActive = isActive;

    const branch = await prisma.branch.update({ where: { id: req.params.id as string }, data });
    res.json(branch);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.branch.delete({ where: { id: req.params.id as string } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
