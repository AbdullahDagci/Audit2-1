import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/templates
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const facilityType = req.query.facilityType as string | undefined;
    const isAdminOrManager = req.userRole === 'admin' || req.userRole === 'manager';
    const where: any = {};
    // Admin ve manager tum sablonlari gorur, denetçi sadece aktifleri
    if (!isAdminOrManager) {
      where.isActive = true;
    }
    if (facilityType) where.facilityType = facilityType;

    const templates = await prisma.checklistTemplate.findMany({
      where,
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
          include: { items: { orderBy: { sortOrder: 'asc' } } },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json(templates);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/templates/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const template = await prisma.checklistTemplate.findUnique({
      where: { id: req.params.id as string },
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
          include: { items: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });
    if (!template) return res.status(404).json({ error: 'Şablon bulunamadı' });
    res.json(template);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/templates
router.post('/', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { categories, ...templateData } = req.body;
    const template = await prisma.checklistTemplate.create({
      data: {
        ...templateData,
        createdById: req.userId,
        categories: categories ? {
          create: categories.map((cat: any, idx: number) => ({
            name: cat.name,
            sortOrder: idx,
            weight: cat.weight || 1.0,
            items: cat.items ? {
              create: cat.items.map((item: any, iIdx: number) => ({
                questionText: item.questionText,
                itemType: item.itemType || 'boolean',
                maxScore: item.maxScore || 10,
                isCritical: item.isCritical || false,
                photoRequired: item.photoRequired || false,
                helpText: item.helpText,
                sortOrder: iIdx,
              })),
            } : undefined,
          })),
        } : undefined,
      },
      include: { categories: { include: { items: true } } },
    });
    res.status(201).json(template);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/templates/:id
router.put('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, facilityType, isActive } = req.body;
    const template = await prisma.checklistTemplate.update({
      where: { id: req.params.id as string },
      data: { name, facilityType, isActive },
      include: { categories: { include: { items: true } } },
    });
    res.json(template);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/templates/:id
router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.checklistTemplate.delete({ where: { id: req.params.id as string } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============ KATEGORI YONETIMI ============

// POST /api/templates/:id/categories
router.post('/:id/categories', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, weight } = req.body;
    const maxOrder = await prisma.checklistCategory.aggregate({
      where: { templateId: req.params.id as string },
      _max: { sortOrder: true },
    });
    const category = await prisma.checklistCategory.create({
      data: {
        templateId: req.params.id as string,
        name,
        weight: weight || 1.0,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
      include: { items: true },
    });
    res.status(201).json(category);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/templates/categories/:categoryId
router.put('/categories/:categoryId', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, weight, sortOrder } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (weight !== undefined) data.weight = weight;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    const category = await prisma.checklistCategory.update({
      where: { id: req.params.categoryId as string },
      data,
      include: { items: true },
    });
    res.json(category);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/templates/categories/:categoryId
router.delete('/categories/:categoryId', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.checklistCategory.delete({ where: { id: req.params.categoryId as string } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============ MADDE YONETIMI ============

// POST /api/templates/categories/:categoryId/items
router.post('/categories/:categoryId/items', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { questionText, itemType, maxScore, isCritical, photoRequired, helpText } = req.body;
    const maxOrder = await prisma.checklistItem.aggregate({
      where: { categoryId: req.params.categoryId as string },
      _max: { sortOrder: true },
    });
    const item = await prisma.checklistItem.create({
      data: {
        categoryId: req.params.categoryId as string,
        questionText,
        itemType: itemType || 'boolean',
        maxScore: maxScore || 10,
        isCritical: isCritical || false,
        photoRequired: photoRequired || false,
        helpText,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
    res.status(201).json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/templates/items/:itemId
router.put('/items/:itemId', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { questionText, itemType, maxScore, isCritical, photoRequired, helpText, sortOrder } = req.body;
    const data: any = {};
    if (questionText !== undefined) data.questionText = questionText;
    if (itemType !== undefined) data.itemType = itemType;
    if (maxScore !== undefined) data.maxScore = maxScore;
    if (isCritical !== undefined) data.isCritical = isCritical;
    if (photoRequired !== undefined) data.photoRequired = photoRequired;
    if (helpText !== undefined) data.helpText = helpText;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    const item = await prisma.checklistItem.update({
      where: { id: req.params.itemId as string },
      data,
    });
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/templates/items/:itemId
router.delete('/items/:itemId', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.checklistItem.delete({ where: { id: req.params.itemId as string } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
