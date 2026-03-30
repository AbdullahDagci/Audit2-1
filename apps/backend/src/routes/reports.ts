import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/reports/dashboard
router.get('/dashboard', authenticate, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalInspections, completedInspections, criticalCount, pendingSchedules] = await Promise.all([
      prisma.inspection.count(),
      prisma.inspection.findMany({
        where: { status: { in: ['completed', 'reviewed'] }, completedAt: { gte: thirtyDaysAgo } },
        select: { scorePercentage: true },
      }),
      prisma.inspectionResponse.count({
        where: {
          passed: false,
          checklistItem: { isCritical: true },
          inspection: { completedAt: { gte: thirtyDaysAgo } },
        },
      }),
      prisma.inspectionSchedule.count({
        where: { isActive: true, nextDueDate: { lte: new Date() } },
      }),
    ]);

    const avgScore = completedInspections.length > 0
      ? completedInspections.reduce((sum, i) => sum + Number(i.scorePercentage || 0), 0) / completedInspections.length
      : 0;

    // Şube bazli performans
    const branchWhere: any = { isActive: true };
    if (req.userRole === 'manager') branchWhere.managerId = req.userId;

    const branchPerformance = await prisma.branch.findMany({
      where: branchWhere,
      select: {
        id: true, name: true, facilityType: true,
        inspections: {
          where: { status: { in: ['completed', 'reviewed'] }, completedAt: { gte: thirtyDaysAgo } },
          select: { scorePercentage: true },
          orderBy: { completedAt: 'desc' },
          take: 10,
        },
      },
    });

    const branches = branchPerformance.map((b) => ({
      id: b.id,
      name: b.name,
      facilityType: b.facilityType,
      avgScore: b.inspections.length > 0
        ? Math.round(b.inspections.reduce((s, i) => s + Number(i.scorePercentage || 0), 0) / b.inspections.length * 100) / 100
        : 0,
      inspectionCount: b.inspections.length,
    }));

    // Son denetimler
    const recentInspections = await prisma.inspection.findMany({
      where: { status: { in: ['completed', 'reviewed'] } },
      include: {
        branch: { select: { name: true } },
        inspector: { select: { fullName: true } },
      },
      orderBy: { completedAt: 'desc' },
      take: 5,
    });

    res.json({
      stats: {
        totalInspections,
        avgScore: Math.round(avgScore * 100) / 100,
        criticalCount,
        pendingSchedules,
      },
      branches,
      recentInspections,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/branch-comparison
router.get('/branch-comparison', authenticate, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const where: any = { status: 'completed' as const };
    if (startDate) where.completedAt = { gte: new Date(startDate as string) };
    if (endDate) where.completedAt = { ...where.completedAt, lte: new Date(endDate as string) };

    const inspections = await prisma.inspection.findMany({
      where,
      select: {
        scorePercentage: true,
        completedAt: true,
        branch: { select: { id: true, name: true, facilityType: true } },
      },
    });

    const grouped: Record<string, { name: string; scores: number[]; facilityType: string }> = {};
    for (const insp of inspections) {
      if (!grouped[insp.branch.id]) {
        grouped[insp.branch.id] = { name: insp.branch.name, facilityType: insp.branch.facilityType, scores: [] };
      }
      grouped[insp.branch.id].scores.push(Number(insp.scorePercentage || 0));
    }

    const result = Object.entries(grouped).map(([id, data]) => ({
      branchId: id,
      branchName: data.name,
      facilityType: data.facilityType,
      avgScore: data.scores.length > 0 ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length * 100) / 100 : 0,
      inspectionCount: data.scores.length,
    }));

    res.json(result.sort((a, b) => b.avgScore - a.avgScore));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
