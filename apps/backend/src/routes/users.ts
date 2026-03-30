import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/users
router.get('/', authenticate, requireRole('admin', 'manager'), async (_req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, email: true, fullName: true, role: true, phone: true, isActive: true, createdAt: true,
        managedBranches: { select: { id: true, name: true } },
      },
      orderBy: { fullName: 'asc' },
    });
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id
router.put('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { password, branchIds, ...data } = req.body;
    const userId = req.params.id as string;

    // Şifre değiştirilmek isteniyorsa hash'le
    if (password && password.trim().length >= 4) {
      data.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, fullName: true, role: true, phone: true, isActive: true },
    });

    // Müdür ise şube atamalarını güncelle
    if (branchIds !== undefined) {
      // Önceki atamaları kaldır
      await prisma.branch.updateMany({
        where: { managerId: userId },
        data: { managerId: null },
      });
      // Yeni atamaları yap
      if (branchIds && branchIds.length > 0) {
        await prisma.branch.updateMany({
          where: { id: { in: branchIds } },
          data: { managerId: userId },
        });
      }
    }

    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id/password - Şifre değiştirme (admin veya kullanıcının kendisi)
router.put('/:id/password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id as string;
    const { currentPassword, newPassword } = req.body;

    // Admin herkesin şifresini değiştirebilir, kullanıcı sadece kendisininkini
    if (req.userRole !== 'admin' && req.userId !== userId) {
      return res.status(403).json({ error: 'Bu işlemi yapmaya yetkiniz yok' });
    }

    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'Yeni şifre en az 4 karakter olmalı' });
    }

    // Admin değilse mevcut şifreyi doğrula
    if (req.userRole !== 'admin') {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Mevcut şifre gerekli' });
      }
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        return res.status(401).json({ error: 'Mevcut şifre hatalı' });
      }
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    res.json({ message: 'Şifre başarıyla değiştirildi' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id - Kullanıcı deaktif et (soft delete)
router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id as string;

    // Kendini silemesin
    if (req.userId === userId) {
      return res.status(400).json({ error: 'Kendinizi silemezsiniz' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    // Müdür ise şube atamalarını kaldır
    await prisma.branch.updateMany({
      where: { managerId: userId },
      data: { managerId: null },
    });

    res.json({ message: 'Kullanıcı deaktif edildi' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id/preferences - Bildirim tercihlerini güncelle
router.put('/:id/preferences', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id as string;
    // Kullanıcı sadece kendi tercihlerini değiştirebilir (admin hariç)
    if (req.userRole !== 'admin' && req.userId !== userId) {
      return res.status(403).json({ error: 'Bu işlemi yapmaya yetkiniz yok' });
    }

    const { emailNotifications, pushNotifications, criticalAlerts } = req.body;
    const data: any = {};
    if (emailNotifications !== undefined) data.emailNotifications = emailNotifications;
    if (pushNotifications !== undefined) data.pushNotifications = pushNotifications;
    if (criticalAlerts !== undefined) data.criticalAlerts = criticalAlerts;

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, emailNotifications: true, pushNotifications: true, criticalAlerts: true },
    });

    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
