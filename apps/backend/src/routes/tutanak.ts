import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { logActivity } from '../services/activity-logger';

const router = Router();

// GET /api/tutanak/inspection/:inspectionId - Denetimin tutanaklari
router.get('/inspection/:inspectionId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const tutanaklar = await prisma.tutanak.findMany({
      where: { inspectionId: req.params.inspectionId as string },
      include: {
        createdBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(tutanaklar);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tutanak/:id - Tek bir tutanak
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const tutanak = await prisma.tutanak.findUnique({
      where: { id: req.params.id as string },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        inspection: {
          include: {
            branch: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!tutanak) return res.status(404).json({ error: 'Tutanak bulunamadı' });

    res.json(tutanak);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tutanak - Tutanak oluştur
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { inspectionId, title, content } = req.body;

    if (!inspectionId || !content) {
      return res.status(400).json({ error: 'inspectionId ve content alanları gereklidir' });
    }

    const inspection = await prisma.inspection.findUnique({
      where: { id: inspectionId },
    });

    if (!inspection) return res.status(404).json({ error: 'Denetim bulunamadı' });

    const tutanak = await prisma.tutanak.create({
      data: {
        inspectionId,
        title: title || 'Tutanak',
        content,
        status: 'draft',
        createdById: req.userId!,
      },
      include: {
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    await logActivity({
      userId: req.userId,
      action: 'TUTANAK_CREATED',
      entityType: 'tutanak',
      entityId: tutanak.id,
      details: { inspectionId, title: tutanak.title },
      ipAddress: req.ip,
    });

    res.status(201).json(tutanak);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tutanak/:id - Tutanak güncelle (sadece taslak durumunda)
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const tutanak = await prisma.tutanak.findUnique({
      where: { id: req.params.id as string },
    });

    if (!tutanak) return res.status(404).json({ error: 'Tutanak bulunamadı' });

    if (tutanak.status !== 'draft') {
      return res.status(400).json({ error: 'Sadece taslak durumdaki tutanaklar güncellenebilir' });
    }

    const { title, content } = req.body;

    const updated = await prisma.tutanak.update({
      where: { id: req.params.id as string },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
      },
      include: {
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    await logActivity({
      userId: req.userId,
      action: 'TUTANAK_UPDATED',
      entityType: 'tutanak',
      entityId: updated.id,
      details: { inspectionId: updated.inspectionId, title: updated.title },
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tutanak/:id/send - Tutanağı gönder
router.post('/:id/send', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const tutanak = await prisma.tutanak.findUnique({
      where: { id: req.params.id as string },
    });

    if (!tutanak) return res.status(404).json({ error: 'Tutanak bulunamadı' });

    if (tutanak.status !== 'draft') {
      return res.status(400).json({ error: 'Bu tutanak zaten gönderilmiş' });
    }

    const updated = await prisma.tutanak.update({
      where: { id: req.params.id as string },
      data: {
        status: 'sent',
        sentAt: new Date(),
      },
      include: {
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    await logActivity({
      userId: req.userId,
      action: 'TUTANAK_SENT',
      entityType: 'tutanak',
      entityId: updated.id,
      details: { inspectionId: updated.inspectionId, title: updated.title },
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
