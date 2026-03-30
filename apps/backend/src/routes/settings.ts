import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { sendEmail } from '../services/email';

const router = Router();

// GET /api/settings/management-emails
router.get('/management-emails', authenticate, requireRole('admin'), async (_req: AuthRequest, res: Response) => {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'management_emails' } });
    const emails: string[] = setting ? JSON.parse(setting.value) : [];
    res.json({ emails });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings/management-emails
router.put('/management-emails', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { emails } = req.body;
    if (!Array.isArray(emails)) {
      return res.status(400).json({ error: 'emails bir dizi olmalı' });
    }

    // Email formatı doğrulama
    const validEmails = emails.filter((e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e?.trim()));

    await prisma.systemSetting.upsert({
      where: { key: 'management_emails' },
      create: { key: 'management_emails', value: JSON.stringify(validEmails) },
      update: { value: JSON.stringify(validEmails) },
    });

    res.json({ emails: validEmails, message: 'Yönetim mail listesi güncellendi' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/test-email - Test maili gönder
router.post('/test-email', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ error: 'Hedef email gerekli' });

    const result = await sendEmail({
      to,
      subject: 'ERTANSA Denetim Sistemi - Test Maili',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #2E7D32; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">ERTANSA</h1>
            <p style="color: #C8E6C9; margin: 5px 0 0;">Denetim Sistemi</p>
          </div>
          <div style="padding: 30px; background-color: #ffffff;">
            <h2 style="color: #333;">Test Maili</h2>
            <p style="color: #666;">Bu mail, SMTP email servisinin doğru çalıştığını doğrulamak için gönderilmiştir.</p>
            <div style="background-color: #E8F5E9; border-left: 4px solid #2E7D32; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <strong style="color: #2E7D32;">Durum: Başarılı</strong><br/>
              <span style="color: #555;">Tarih: ${new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center;">
            <p style="color: #999; font-size: 11px; margin: 0;">ERTANSA Gıda - Denetim Yönetim Sistemi</p>
          </div>
        </div>
      `,
    });

    if (result.success) {
      res.json({ message: 'Test maili gönderildi', messageId: result.messageId });
    } else {
      res.status(500).json({ error: 'Mail gönderilemedi' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
