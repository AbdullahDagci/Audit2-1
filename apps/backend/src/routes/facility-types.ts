import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/facility-types - Tum tesis tiplerini getir
router.get('/', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const types = await prisma.$queryRaw`SELECT id, key, label, is_active, sort_order FROM facility_types ORDER BY sort_order ASC`;
    res.json(types);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/facility-types - Yeni tesis tipi ekle (admin)
router.post('/', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { key, label } = req.body;
    if (!key || !label) return res.status(400).json({ error: 'key ve label gerekli' });

    // Enum'a eklemeye calis (yoksa hata vermez)
    try {
      await prisma.$executeRawUnsafe(`ALTER TYPE "FacilityType" ADD VALUE IF NOT EXISTS '${key}'`);
    } catch {}

    const maxOrder: any = await prisma.$queryRaw`SELECT COALESCE(MAX(sort_order), 0) + 1 as next FROM facility_types`;
    const nextOrder = maxOrder[0]?.next || 1;

    await prisma.$executeRaw`INSERT INTO facility_types (key, label, sort_order) VALUES (${key}, ${label}, ${nextOrder}) ON CONFLICT (key) DO UPDATE SET label = ${label}`;

    const result: any = await prisma.$queryRaw`SELECT id, key, label, is_active, sort_order FROM facility_types WHERE key = ${key}`;
    res.status(201).json(result[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/facility-types/:key - Tesis tipini güncelle (admin)
router.put('/:key', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { label, is_active, sort_order } = req.body;
    const key = req.params.key as string;

    const sets: string[] = [];
    const vals: any[] = [];
    if (label !== undefined) { sets.push('label = $1'); vals.push(label); }
    if (is_active !== undefined) { sets.push(`is_active = ${is_active}`); }
    if (sort_order !== undefined) { sets.push(`sort_order = ${sort_order}`); }

    if (sets.length > 0) {
      await prisma.$executeRawUnsafe(`UPDATE facility_types SET ${sets.join(', ')} WHERE key = '${key}'`);
    }

    const result: any = await prisma.$queryRaw`SELECT id, key, label, is_active, sort_order FROM facility_types WHERE key = ${key}`;
    if (!result[0]) return res.status(404).json({ error: 'Tip bulunamadı' });
    res.json(result[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
