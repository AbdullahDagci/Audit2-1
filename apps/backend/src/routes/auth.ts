import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index';
import { authenticate, generateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email ve şifre gerekli' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Geçersiz email veya şifre' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Geçersiz email veya şifre' });
    }

    const token = generateToken(user.id, user.role);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register (sadece admin)
router.post('/register', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Sadece admin kullanıcı oluşturabilir' });
    }

    const { email, password, fullName, role, phone, branchIds } = req.body;
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Email, şifre ve ad soyad gerekli' });
    }

    if (role === 'manager' && (!branchIds || branchIds.length === 0)) {
      return res.status(400).json({ error: 'Müdür için en az bir şube seçilmelidir' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Bu email zaten kayıtlı' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed, fullName, role: role || 'inspector', phone },
      select: { id: true, email: true, fullName: true, role: true, phone: true },
    });

    // Müdür ise seçilen şubelere ata
    if (role === 'manager' && branchIds && branchIds.length > 0) {
      await prisma.branch.updateMany({
        where: { id: { in: branchIds } },
        data: { managerId: user.id },
      });
    }

    res.status(201).json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, fullName: true, role: true, phone: true, avatarUrl: true, emailNotifications: true, pushNotifications: true, criticalAlerts: true },
    });
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
