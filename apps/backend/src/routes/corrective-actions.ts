import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { upload, compressImage } from '../middleware/upload';
import { checkAndFinalizeInspection } from '../services/inspection-flow';
import { logActivity } from '../services/activity-logger';

const router = Router();

// GET /api/corrective-actions/inspection/:inspectionId - Denetimin düzeltici faaliyetleri
router.get('/inspection/:inspectionId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const actions = await prisma.correctiveAction.findMany({
      where: { inspectionId: req.params.inspectionId as string },
      include: {
        response: {
          include: {
            checklistItem: { include: { category: true } },
          },
        },
        createdBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(actions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/corrective-actions/inspection/:inspectionId/deficiencies - Eksik maddelerin listesi
router.get('/inspection/:inspectionId/deficiencies', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const inspection = await prisma.inspection.findUnique({
      where: { id: req.params.inspectionId as string },
      include: {
        responses: {
          include: {
            checklistItem: { include: { category: true } },
            actions: true,
          },
        },
      },
    });

    if (!inspection) return res.status(404).json({ error: 'Denetim bulunamadı' });

    const deficiencies = inspection.responses.filter(r => {
      const item = r.checklistItem;
      if (item.itemType === 'boolean' && r.passed === false) return true;
      if (item.itemType === 'score' && r.score !== null && r.score < item.maxScore * 0.5) return true;
      return false;
    }).map(r => ({
      responseId: r.id,
      checklistItemId: r.checklistItem.id,
      questionText: r.checklistItem.questionText,
      categoryName: r.checklistItem.category.name,
      isCritical: r.checklistItem.isCritical,
      itemType: r.checklistItem.itemType,
      score: r.score,
      maxScore: r.checklistItem.maxScore,
      passed: r.passed,
      notes: r.notes,
      hasCorrectiveAction: r.actions.length > 0,
      correctiveAction: r.actions[0] || null,
    }));

    // Kritik maddeler önce
    deficiencies.sort((a, b) => {
      if (a.isCritical && !b.isCritical) return -1;
      if (!a.isCritical && b.isCritical) return 1;
      return 0;
    });

    res.json({
      deficiencies,
      totalDeficiencies: deficiencies.length,
      criticalDeficiencies: deficiencies.filter(d => d.isCritical).length,
      allCriticalsCovered: deficiencies.filter(d => d.isCritical).every(d => d.hasCorrectiveAction && d.correctiveAction?.evidencePhotoPath),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/corrective-actions - Düzeltici faaliyet oluştur
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { inspectionId, responseId, description } = req.body;

    if (!inspectionId || !responseId || !description) {
      return res.status(400).json({ error: 'inspectionId, responseId ve description gereklidir' });
    }

    const inspection = await prisma.inspection.findUnique({
      where: { id: inspectionId },
      include: { branch: true },
    });

    if (!inspection) return res.status(404).json({ error: 'Denetim bulunamadı' });

    // Yetki kontrolü: şube sorumlusu veya admin
    const isManager = inspection.branch.managerId === req.userId;
    const isAdmin = req.userRole === 'admin';
    if (!isManager && !isAdmin) {
      return res.status(403).json({ error: 'Düzeltici faaliyet ekleme yetkiniz yok' });
    }

    if (inspection.status !== 'completed' && inspection.status !== 'pending_action') {
      return res.status(400).json({ error: 'Sadece tamamlanmış veya işlem bekleyen denetimlere düzeltici faaliyet eklenebilir' });
    }

    // Response'ın bu denetime ait olduğunu kontrol et
    const response = await prisma.inspectionResponse.findUnique({
      where: { id: responseId },
      include: { checklistItem: true },
    });

    if (!response || response.inspectionId !== inspectionId) {
      return res.status(400).json({ error: 'Geçersiz response' });
    }

    const action = await prisma.correctiveAction.create({
      data: {
        inspectionId,
        responseId,
        description,
        isCritical: response.checklistItem.isCritical,
        createdById: req.userId!,
        status: 'pending',
      },
      include: {
        response: { include: { checklistItem: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    // İlk düzeltici faaliyet ise durumu pending_action'a güncelle
    if (inspection.status === 'completed') {
      await prisma.inspection.update({
        where: { id: inspectionId },
        data: { status: 'pending_action' },
      });
    }

    await logActivity({
      userId: req.userId,
      action: 'CORRECTIVE_ACTION_CREATED',
      entityType: 'corrective_action',
      entityId: action.id,
      details: { inspectionId, isCritical: action.isCritical, questionText: response.checklistItem.questionText },
      ipAddress: req.ip,
    });

    res.status(201).json(action);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/corrective-actions/batch - Toplu düzeltici faaliyet oluştur
router.post('/batch', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { inspectionId, actions } = req.body;

    if (!inspectionId || !Array.isArray(actions) || actions.length === 0) {
      return res.status(400).json({ error: 'inspectionId ve en az bir action gerekli' });
    }

    const inspection = await prisma.inspection.findUnique({
      where: { id: inspectionId },
      include: { branch: true },
    });

    if (!inspection) return res.status(404).json({ error: 'Denetim bulunamadı' });

    const isManager = inspection.branch.managerId === req.userId;
    const isAdmin = req.userRole === 'admin';
    if (!isManager && !isAdmin) {
      return res.status(403).json({ error: 'Düzeltici faaliyet ekleme yetkiniz yok' });
    }

    if (inspection.status !== 'completed' && inspection.status !== 'pending_action') {
      return res.status(400).json({ error: 'Sadece tamamlanmış veya işlem bekleyen denetimlere düzeltici faaliyet eklenebilir' });
    }

    const createdActions = [];
    for (const item of actions) {
      if (!item.responseId || !item.description?.trim()) continue;

      const response = await prisma.inspectionResponse.findUnique({
        where: { id: item.responseId },
        include: { checklistItem: true },
      });

      if (!response || response.inspectionId !== inspectionId) continue;

      // Zaten faaliyet varsa atla
      const existing = await prisma.correctiveAction.findFirst({
        where: { inspectionId, responseId: item.responseId },
      });
      if (existing) continue;

      const action = await prisma.correctiveAction.create({
        data: {
          inspectionId,
          responseId: item.responseId,
          description: item.description.trim(),
          isCritical: response.checklistItem.isCritical,
          createdById: req.userId!,
          status: 'pending',
        },
        include: {
          response: { include: { checklistItem: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
      });

      createdActions.push(action);

      await logActivity({
        userId: req.userId,
        action: 'CORRECTIVE_ACTION_CREATED',
        entityType: 'corrective_action',
        entityId: action.id,
        details: { inspectionId, isCritical: action.isCritical },
        ipAddress: req.ip,
      });
    }

    // Durumu pending_action'a güncelle
    if (inspection.status === 'completed' && createdActions.length > 0) {
      await prisma.inspection.update({
        where: { id: inspectionId },
        data: { status: 'pending_action' },
      });
    }

    res.status(201).json({ created: createdActions.length, actions: createdActions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/corrective-actions/:id/evidence - Kanıt fotoğrafı yükle
router.post('/:id/evidence', authenticate, upload.single('photo'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Fotoğraf gerekli' });

    const action = await prisma.correctiveAction.findUnique({
      where: { id: req.params.id as string },
      include: {
        inspection: {
          include: { branch: true },
        },
        response: { include: { checklistItem: true } },
      },
    });

    if (!action) return res.status(404).json({ error: 'Düzeltici faaliyet bulunamadı' });

    // Yetki kontrolü
    const isManager = action.inspection.branch.managerId === req.userId;
    const isAdmin = req.userRole === 'admin';
    if (!isManager && !isAdmin) {
      return res.status(403).json({ error: 'Kanıt yükleme yetkiniz yok' });
    }

    // Sharp ile sıkıştır
    const compressedName = await compressImage(req.file.path);

    const updated = await prisma.correctiveAction.update({
      where: { id: req.params.id as string },
      data: {
        evidencePhotoPath: `/uploads/${compressedName}`,
        evidenceNotes: req.body.notes || null,
        evidenceUploadedAt: new Date(),
        status: 'evidence_uploaded',
      },
    });

    // Denetçiye bildirim + push gönder
    const { createAndPushNotification } = require('../services/push-notification');
    await createAndPushNotification(
      action.inspection.inspectorId,
      'Düzeltici Faaliyet Kanıtı Yüklendi',
      `${action.inspection.branch.name} şubesindeki "${action.response.checklistItem.questionText}" maddesi için kanıt yüklendi.`,
      { inspectionId: action.inspectionId, correctiveActionId: action.id, type: 'evidence_uploaded' },
    );

    await logActivity({
      userId: req.userId,
      action: 'EVIDENCE_UPLOADED',
      entityType: 'corrective_action',
      entityId: action.id,
      details: { inspectionId: action.inspectionId, isCritical: action.isCritical },
      ipAddress: req.ip,
    });

    // Tüm kritik maddeler tamamlandı mı kontrol et
    const finalized = await checkAndFinalizeInspection(action.inspectionId);

    res.json({ ...updated, inspectionFinalized: finalized });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/corrective-actions/:id - Düzeltici faaliyet güncelle
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const action = await prisma.correctiveAction.findUnique({
      where: { id: req.params.id as string },
      include: { inspection: { include: { branch: true } } },
    });

    if (!action) return res.status(404).json({ error: 'Düzeltici faaliyet bulunamadı' });

    const isManager = action.inspection.branch.managerId === req.userId;
    const isAdmin = req.userRole === 'admin';
    if (!isManager && !isAdmin) {
      return res.status(403).json({ error: 'Güncelleme yetkiniz yok' });
    }

    const updated = await prisma.correctiveAction.update({
      where: { id: req.params.id as string },
      data: {
        description: req.body.description || action.description,
        evidenceNotes: req.body.evidenceNotes !== undefined ? req.body.evidenceNotes : action.evidenceNotes,
      },
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
