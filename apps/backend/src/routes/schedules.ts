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
    const schedule = await prisma.inspectionSchedule.create({ data: req.body });
    res.status(201).json(schedule);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/schedules/:id
router.put('/:id', authenticate, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const schedule = await prisma.inspectionSchedule.update({
      where: { id: req.params.id as string },
      data: req.body,
    });
    res.json(schedule);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
