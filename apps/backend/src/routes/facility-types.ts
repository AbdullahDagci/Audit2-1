import { Router, Response } from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// Tesis tipleri enum'dan türetilmiş statik liste
// Prisma schema'daki FacilityType enum'una karşılık gelir
const FACILITY_TYPES = [
  { key: 'magaza', label: 'Mağaza', is_active: true, sort_order: 1 },
  { key: 'kesimhane', label: 'Kesimhane', is_active: true, sort_order: 2 },
  { key: 'ahir', label: 'Ahır', is_active: true, sort_order: 3 },
  { key: 'yufka', label: 'Yufka Üretim', is_active: true, sort_order: 4 },
  { key: 'depo', label: 'Depo', is_active: true, sort_order: 5 },
];

// GET /api/facility-types
router.get('/', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    res.json(FACILITY_TYPES);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/facility-types (bilgilendirme amaçlı - enum'a runtime'da eklenemez)
router.post('/', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { key, label } = req.body;
    if (!key || !label) return res.status(400).json({ error: 'key ve label gerekli' });

    // Zaten var mı kontrol et
    const exists = FACILITY_TYPES.find(t => t.key === key);
    if (exists) {
      return res.status(409).json({ error: 'Bu tesis tipi zaten mevcut' });
    }

    // Yeni tip ekle (runtime - sunucu restart olana kadar geçerli)
    FACILITY_TYPES.push({ key, label, is_active: true, sort_order: FACILITY_TYPES.length + 1 });
    res.status(201).json(FACILITY_TYPES[FACILITY_TYPES.length - 1]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/facility-types/:key
router.put('/:key', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const key = req.params.key as string;
    const item = FACILITY_TYPES.find(t => t.key === key);
    if (!item) return res.status(404).json({ error: 'Tip bulunamadı' });

    if (req.body.label !== undefined) item.label = req.body.label;
    if (req.body.is_active !== undefined) item.is_active = req.body.is_active;
    if (req.body.sort_order !== undefined) item.sort_order = req.body.sort_order;

    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
