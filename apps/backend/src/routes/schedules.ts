import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/schedules
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const where: any = { isActive: true };
    if (req.userRole === 'inspector') {
      where.inspectorId = req.userId;
    } else if (req.userRole === 'manager') {
      where.branch = { managerId: req.userId };
    }

    const schedules = await prisma.inspectionSchedule.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true, facilityType: true } },
        template: { select: { id: true, name: true } },
        inspector: { select: { id: true, fullName: true } },
      },
      orderBy: { nextDueDate: 'asc' },
    });
    res.json(schedules);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/schedules
router.post('/', authenticate, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const { branchId, templateId, inspectorId, frequencyDays, nextDueDate } = req.body;

    if (!branchId || !templateId || !nextDueDate) {
      return res.status(400).json({ error: 'branchId, templateId ve nextDueDate gerekli' });
    }

    const schedule = await prisma.inspectionSchedule.create({
      data: {
        branchId,
        templateId,
        inspectorId: inspectorId || null,
        frequencyDays: parseInt(frequencyDays) || 30,
        nextDueDate: new Date(nextDueDate),
      },
      include: {
        branch: { select: { id: true, name: true, facilityType: true } },
        template: { select: { id: true, name: true } },
        inspector: { select: { id: true, fullName: true } },
      },
    });
    res.status(201).json(schedule);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/schedules/:id
router.put('/:id', authenticate, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const data: any = {};
    if (req.body.frequencyDays) data.frequencyDays = parseInt(req.body.frequencyDays);
    if (req.body.nextDueDate) data.nextDueDate = new Date(req.body.nextDueDate);
    if (req.body.inspectorId) data.inspectorId = req.body.inspectorId;
    if (req.body.isActive !== undefined) data.isActive = req.body.isActive;

    const schedule = await prisma.inspectionSchedule.update({
      where: { id: req.params.id as string },
      data,
      include: {
        branch: { select: { id: true, name: true, facilityType: true } },
        template: { select: { id: true, name: true } },
        inspector: { select: { id: true, fullName: true } },
      },
    });
    res.json(schedule);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/schedules/:id
router.delete('/:id', authenticate, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.inspectionSchedule.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Plan silindi' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
