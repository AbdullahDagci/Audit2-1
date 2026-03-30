import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { upload, compressImage, createThumbnail } from '../middleware/upload';
import { qs } from '../utils/query';
import { handleInspectionCompleted } from '../services/inspection-flow';
import { logActivity } from '../services/activity-logger';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const branchId = qs(req.query.branchId);
    const status = qs(req.query.status);
    const facilityType = qs(req.query.facilityType);
    const page = parseInt(qs(req.query.page) || '1');
    const limit = parseInt(qs(req.query.limit) || '20');
    const where: any = {};

    if (req.userRole === 'inspector') {
      where.inspectorId = req.userId;
    } else if (req.userRole === 'manager') {
      // Manager sadece yonettigi subelerin denetimlerini gorur
      where.branch = { ...where.branch, managerId: req.userId };
    }
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;
    if (facilityType) where.branch = { facilityType };

    const skip = (page - 1) * limit;
    const [inspections, total] = await Promise.all([
      prisma.inspection.findMany({
        where,
        include: {
          branch: { select: { id: true, name: true, facilityType: true } },
          inspector: { select: { id: true, fullName: true } },
          template: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.inspection.count({ where }),
    ]);

    res.json({ data: inspections, total, page, limit });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const inspection = await prisma.inspection.findUnique({
      where: { id: req.params.id as string },
      include: {
        branch: true,
        inspector: { select: { id: true, fullName: true, email: true } },
        template: { include: { categories: { orderBy: { sortOrder: 'asc' }, include: { items: { orderBy: { sortOrder: 'asc' } } } } } },
        responses: { include: { checklistItem: true, photos: true } },
        photos: true,
        actions: { include: { createdBy: { select: { id: true, fullName: true } }, response: { include: { checklistItem: true } } } },
      },
    });
    if (!inspection) return res.status(404).json({ error: 'Denetim bulunamadı' });
    res.json(inspection);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { branchId, templateId, status, scheduledDate, latitude, longitude, locationVerified } = req.body;

    // Admin ve manager denetim başlatamazlar, sadece planlayabilirler
    const isAdminOrManager = req.userRole === 'admin' || req.userRole === 'manager';
    if (isAdminOrManager && status === 'in_progress') {
      return res.status(403).json({ error: 'Yöneticiler denetim başlatamazlar. Sadece denetim planlayabilirsiniz.' });
    }

    const data: any = {
      branchId,
      templateId,
      inspectorId: req.userId,
      status: status || 'draft',
    };

    if (status === 'scheduled') {
      data.scheduledDate = scheduledDate ? new Date(scheduledDate) : null;
    } else {
      data.startedAt = new Date();
    }

    if (latitude !== undefined) data.latitude = latitude;
    if (longitude !== undefined) data.longitude = longitude;
    if (locationVerified !== undefined) data.locationVerified = locationVerified;

    const inspection = await prisma.inspection.create({ data });
    res.status(201).json(inspection);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/responses', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { responses } = req.body;
    const inspectionId = req.params.id as string;

    const created = await prisma.$transaction(
      responses.map((r: any) =>
        prisma.inspectionResponse.upsert({
          where: {
            inspectionId_checklistItemId: {
              inspectionId,
              checklistItemId: r.checklistItemId,
            },
          },
          create: {
            inspectionId,
            checklistItemId: r.checklistItemId,
            score: r.score,
            passed: r.passed,
            textResponse: r.textResponse,
            notes: r.notes,
            severity: r.severity,
          },
          update: {
            score: r.score,
            passed: r.passed,
            textResponse: r.textResponse,
            notes: r.notes,
            severity: r.severity,
          },
        })
      )
    );

    res.json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/photos', authenticate, upload.single('photo'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Fotoğraf gerekli' });

    // Sharp ile sıkıştır + thumbnail oluştur
    const compressedName = await compressImage(req.file.path);
    const thumbName = await createThumbnail(req.file.path.replace(req.file.filename, compressedName));

    const photo = await prisma.inspectionPhoto.create({
      data: {
        inspectionId: req.params.id as string,
        responseId: req.body.responseId || null,
        storagePath: `/uploads/${compressedName}`,
        thumbnailPath: thumbName ? `/uploads/${thumbName}` : null,
        latitude: req.body.latitude ? parseFloat(req.body.latitude) : null,
        longitude: req.body.longitude ? parseFloat(req.body.longitude) : null,
        caption: req.body.caption,
      },
    });

    res.status(201).json(photo);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/complete', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const inspection = await prisma.inspection.findUnique({
      where: { id: req.params.id as string },
      include: {
        template: {
          include: { categories: { include: { items: true } } },
        },
        responses: true,
      },
    });

    if (!inspection) return res.status(404).json({ error: 'Denetim bulunamadı' });

    const inspData = inspection as any;
    let totalWeight = 0;
    let weightedSum = 0;
    let totalEarned = 0;
    let totalMax = 0;

    for (const category of inspData.template.categories) {
      const weight = Number(category.weight);
      let catEarned = 0;
      let catMax = 0;

      for (const item of category.items) {
        catMax += item.maxScore;
        const response = inspData.responses.find((r: any) => r.checklistItemId === item.id);
        // Yanitsiz maddeler 0 puan alir (catMax'a dahil, earned'a 0)
        if (!response) continue;

        if (item.itemType === 'boolean') {
          if (response.passed) catEarned += item.maxScore;
        } else if (item.itemType === 'score') {
          catEarned += Math.min(response.score ?? 0, item.maxScore);
        }
      }

      const catPercent = catMax > 0 ? (catEarned / catMax) * 100 : 0;
      totalWeight += weight;
      weightedSum += catPercent * weight;
      totalEarned += catEarned;
      totalMax += catMax;
    }

    const percentage = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;

    const updated = await prisma.inspection.update({
      where: { id: req.params.id as string },
      data: {
        status: 'completed',
        completedAt: new Date(),
        totalScore: totalEarned,
        maxPossibleScore: totalMax,
        scorePercentage: percentage,
      },
    });

    await logActivity({
      userId: req.userId,
      action: 'INSPECTION_COMPLETED',
      entityType: 'inspection',
      entityId: req.params.id as string,
      details: { scorePercentage: percentage, totalEarned, totalMax },
      ipAddress: req.ip,
    });

    // Yeni akış: kritik eksik yoksa otomatik tamamla, varsa şube sorumlusuna bildir
    await handleInspectionCompleted(req.params.id as string);

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/inspections/:id - Denetim güncelle (tarih degisikligi, sadece scheduled/draft)
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const inspection = await prisma.inspection.findUnique({
      where: { id: req.params.id as string },
    });

    if (!inspection) return res.status(404).json({ error: 'Denetim bulunamadı' });

    // Sadece kendi denetimini güncelleyebilir (admin haric)
    if (req.userRole !== 'admin' && inspection.inspectorId !== req.userId) {
      return res.status(403).json({ error: 'Bu denetimi güncelleme yetkiniz yok' });
    }

    // Sadece scheduled veya draft durumdaki denetimler güncellenebilir
    if (inspection.status !== 'scheduled' && inspection.status !== 'draft') {
      return res.status(400).json({ error: 'Sadece planlanmış veya taslak denetimler güncellenebilir' });
    }

    // Admin/manager denetimi başlatamazlar
    const isAdminOrManager = req.userRole === 'admin' || req.userRole === 'manager';
    if (isAdminOrManager && req.body.status === 'in_progress') {
      return res.status(403).json({ error: 'Yöneticiler denetim başlatamazlar.' });
    }

    // Tarih kontrolleri
    if (req.body.status === 'in_progress' && (inspection as any).scheduledDate) {
      const scheduled = new Date((inspection as any).scheduledDate);
      scheduled.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (today < scheduled) {
        return res.status(400).json({ error: 'Bu denetim planlanan tarihten önce başlatilamaz.' });
      }
      if (today > scheduled) {
        return res.status(400).json({ error: 'Bu denetimin süresi geçmiştir. Artık başlatilamaz.' });
      }
    }

    const allowedFields: Record<string, any> = {};
    if (req.body.status) allowedFields.status = req.body.status;
    if (req.body.scheduledDate) allowedFields.scheduledDate = new Date(req.body.scheduledDate);
    if (req.body.branchId) allowedFields.branchId = req.body.branchId;
    if (req.body.templateId) allowedFields.templateId = req.body.templateId;
    if (req.body.latitude !== undefined) allowedFields.latitude = req.body.latitude;
    if (req.body.longitude !== undefined) allowedFields.longitude = req.body.longitude;
    if (req.body.locationVerified !== undefined) allowedFields.locationVerified = req.body.locationVerified;
    if (req.body.status === 'in_progress') allowedFields.startedAt = new Date();

    const updated = await prisma.inspection.update({
      where: { id: req.params.id as string },
      data: allowedFields,
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/inspections/:id - Başlanmamış denetimi sil (scheduled/draft)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const inspection = await prisma.inspection.findUnique({
      where: { id: req.params.id as string },
    });

    if (!inspection) return res.status(404).json({ error: 'Denetim bulunamadı' });

    // Sadece kendi denetimini silebilir (admin haric)
    if (req.userRole !== 'admin' && inspection.inspectorId !== req.userId) {
      return res.status(403).json({ error: 'Bu denetimi silme yetkiniz yok' });
    }

    // Sadece başlanmamış denetimler silinebilir
    if (inspection.status !== 'scheduled' && inspection.status !== 'draft') {
      return res.status(400).json({ error: 'Sadece başlanmamış denetimler silinebilir' });
    }

    await prisma.inspection.delete({
      where: { id: req.params.id as string },
    });

    res.json({ message: 'Denetim silindi' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inspections/previous-findings/:branchId - Önceki denetimin kritik eksiklikleri
router.get('/previous-findings/:branchId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const lastInspection = await prisma.inspection.findFirst({
      where: {
        branchId: req.params.branchId as string,
        status: { in: ['completed', 'pending_action', 'reviewed'] },
      },
      orderBy: { completedAt: 'desc' },
      include: {
        responses: {
          include: {
            checklistItem: {
              include: { category: true },
            },
          },
        },
      },
    });

    if (!lastInspection) {
      return res.json({ findings: [], inspectionId: null, inspectionDate: null });
    }

    const criticalFailures = lastInspection.responses.filter(r => {
      const item = r.checklistItem;
      if (!item.isCritical) return false;
      if (item.itemType === 'boolean' && r.passed === false) return true;
      if (item.itemType === 'score' && r.score !== null && r.score < item.maxScore * 0.5) return true;
      return false;
    });

    const findings = criticalFailures.map(r => ({
      itemId: r.checklistItem.id,
      questionText: r.checklistItem.questionText,
      categoryName: r.checklistItem.category.name,
      notes: r.notes,
      score: r.score,
      passed: r.passed,
    }));

    res.json({
      findings,
      inspectionId: lastInspection.id,
      inspectionDate: lastInspection.completedAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
