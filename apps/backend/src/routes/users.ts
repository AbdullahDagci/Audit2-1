import { Router, Response } from 'express';
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

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, fullName: true, role: true, phone: true, isActive: true },
    });

    // Müdür ise şube atamalarini güncelle
    if (branchIds !== undefined) {
      // Onceki atamalari kaldir
      await prisma.branch.updateMany({
        where: { managerId: userId },
        data: { managerId: null },
      });
      // Yeni atamalari yap
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

export default router;
