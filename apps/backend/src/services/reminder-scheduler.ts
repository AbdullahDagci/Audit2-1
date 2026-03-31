import cron from 'node-cron';
import { prisma } from '../index';
import { createAndPushNotification } from './push-notification';
import { logActivity } from './activity-logger';

async function checkPendingEvidence(): Promise<void> {
  try {
    // pending_action durumundaki denetimleri bul
    const pendingInspections = await prisma.inspection.findMany({
      where: { status: 'pending_action' },
      include: {
        branch: { include: { manager: true } },
        actions: {
          where: { status: 'pending' },
          include: {
            response: { include: { checklistItem: true } },
          },
        },
      },
    });

    const now = new Date();
    const admins = await prisma.user.findMany({ where: { role: 'admin', isActive: true } });

    for (const inspection of pendingInspections) {
      const pendingActions = inspection.actions.filter(a => a.status === 'pending');
      if (pendingActions.length === 0) continue;

      for (const action of pendingActions) {
        const createdAt = new Date(action.createdAt);
        const daysSince = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSince < 3) continue;

        const isUrgent = daysSince >= 7;
        const prefix = isUrgent ? 'ACİL: ' : '';
        const suffix = isUrgent
          ? `${daysSince} gündür kanıt yüklenmeyi bekliyor!`
          : `${daysSince} gündür kanıt bekleniyor.`;

        // Şube müdürüne hatırlatma
        if (inspection.branch.managerId) {
          await createAndPushNotification(
            inspection.branch.managerId,
            `${prefix}Kanıt Yükleme Hatırlatması`,
            `${inspection.branch.name} - "${action.response.checklistItem.questionText}" maddesi ${suffix}`,
            { inspectionId: inspection.id, correctiveActionId: action.id, type: 'evidence_reminder', daysSince },
          );
        }

        // Admin'lere bildirim (sadece 7+ gün)
        if (isUrgent) {
          for (const admin of admins) {
            await createAndPushNotification(
              admin.id,
              'ACİL: Kanıt Yüklenmedi',
              `${inspection.branch.name} şubesinde ${pendingActions.length} düzeltici faaliyet ${daysSince} gündür kanıt bekliyor.`,
              { inspectionId: inspection.id, type: 'evidence_overdue', daysSince },
            );
          }
        }
      }

      await logActivity({
        action: 'REMINDER_SENT',
        entityType: 'inspection',
        entityId: inspection.id,
        details: {
          branchName: inspection.branch.name,
          pendingActionCount: pendingActions.length,
        },
      });
    }

    if (pendingInspections.length > 0) {
      console.log(`[Hatırlatma] ${pendingInspections.length} denetim kontrol edildi.`);
    }
  } catch (error) {
    console.error('[Hatırlatma] Hata:', error);
  }
}

async function checkScheduledInspections(): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Bugün planlanmış denetimleri bul
    const schedules = await prisma.inspectionSchedule.findMany({
      where: {
        isActive: true,
        nextDueDate: { gte: today, lt: tomorrow },
      },
      include: {
        branch: true,
        inspector: {
          select: { id: true, email: true, fullName: true, emailNotifications: true, pushNotifications: true },
        },
      },
    });

    for (const schedule of schedules) {
      if (!schedule.inspector) continue;

      // Push + email bildirim (createAndPushNotification her ikisini de yapar)
      await createAndPushNotification(
        schedule.inspector.id,
        'Bugün Denetim Planlandı',
        `${schedule.branch.name} şubesinde bugün denetim yapmanız gerekmektedir.`,
        { type: 'scheduled_reminder', branchId: schedule.branchId, scheduleId: schedule.id },
      );
    }

    if (schedules.length > 0) {
      console.log(`[Planlama] ${schedules.length} planlı denetim hatırlatması gönderildi.`);
    }
  } catch (error) {
    console.error('[Planlama] Hata:', error);
  }
}

export function startReminderScheduler(): void {
  // Her gün sabah 09:00'da çalış (Türkiye saati)
  cron.schedule('0 9 * * *', () => {
    console.log('[Hatırlatma] Günlük kontrol başlatılıyor...');
    checkPendingEvidence();
    checkScheduledInspections();
  });

  console.log('Hatırlatma zamanlayıcı aktif (her gün 09:00)');
}

// Manuel tetikleme (test için)
export { checkPendingEvidence, checkScheduledInspections };
