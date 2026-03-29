import { PrismaClient } from '@prisma/client';
import { generateInspectionPdfBuffer } from './pdf-generator';
import { sendEmail, getManagementEmails } from './email';
import { logActivity } from './activity-logger';

const prisma = new PrismaClient();

export async function checkAndFinalizeInspection(inspectionId: string): Promise<boolean> {
  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId },
    include: {
      branch: { include: { manager: true } },
      inspector: true,
      template: true,
      responses: {
        include: {
          checklistItem: {
            include: { category: true }
          },
          photos: true,
          actions: true,
        }
      },
      actions: {
        include: {
          response: {
            include: {
              checklistItem: { include: { category: true } }
            }
          },
          createdBy: true,
        }
      },
    },
  });

  if (!inspection) return false;

  const criticalDeficiencies = inspection.responses.filter(r => {
    const item = r.checklistItem;
    if (!item.isCritical) return false;
    if (item.itemType === 'boolean' && r.passed === false) return true;
    if (item.itemType === 'score' && r.score !== null && r.score < item.maxScore * 0.5) return true;
    return false;
  });

  if (criticalDeficiencies.length === 0) {
    return true;
  }

  const allCriticalsCovered = criticalDeficiencies.every(deficiency => {
    const action = inspection.actions.find(a => a.responseId === deficiency.id);
    return action && action.evidencePhotoPath;
  });

  if (!allCriticalsCovered) {
    return false;
  }

  await prisma.inspection.update({
    where: { id: inspectionId },
    data: {
      status: 'reviewed',
      reviewedAt: new Date(),
    },
  });

  await logActivity({
    action: 'INSPECTION_FINALIZED',
    entityType: 'inspection',
    entityId: inspectionId,
    details: { branchName: inspection.branch.name, scorePercentage: inspection.scorePercentage },
  });

  const categories = await prisma.checklistCategory.findMany({
    where: { templateId: inspection.templateId },
    orderBy: { sortOrder: 'asc' },
  });

  try {
    const pdfData = {
      inspection,
      branch: inspection.branch,
      inspector: inspection.inspector,
      template: inspection.template,
      responses: inspection.responses,
      categories,
      correctiveActions: inspection.actions,
    };

    const pdfBuffer = await generateInspectionPdfBuffer(pdfData);
    const managementEmails = getManagementEmails();

    if (managementEmails.length > 0) {
      const completedDate = inspection.completedAt
        ? new Date(inspection.completedAt).toLocaleDateString('tr-TR')
        : new Date().toLocaleDateString('tr-TR');

      await sendEmail({
        to: managementEmails,
        subject: `ERTANSA Denetim Raporu - ${inspection.branch.name} - ${completedDate}`,
        html: `
          <h2>Denetim Raporu</h2>
          <p><strong>${inspection.branch.name}</strong> şubesinde yapılan denetim tamamlanmıştır.</p>
          <p>Genel Puan: <strong>%${Math.round(Number(inspection.scorePercentage || 0))}</strong></p>
          <p>Detaylı rapor ekte sunulmuştur.</p>
          <br>
          <p style="color:#999;font-size:12px;">Bu e-posta ERTANSA Denetim Sistemi tarafından otomatik olarak gönderilmiştir.</p>
        `,
        attachments: [{
          filename: `denetim-raporu-${inspection.branch.name.replace(/\s+/g, '-')}-${completedDate}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        }],
      });

      await logActivity({
        action: 'REPORT_EMAIL_SENT',
        entityType: 'inspection',
        entityId: inspectionId,
        details: { recipients: managementEmails },
      });
    }
  } catch (error) {
    console.error('Rapor oluşturma/gönderme hatası:', error);
  }

  const admins = await prisma.user.findMany({ where: { role: 'admin', isActive: true } });
  for (const admin of admins) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        title: 'Denetim Süreci Tamamlandı',
        body: `${inspection.branch.name} şubesindeki denetim süreci tamamlandı. Rapor üst yönetime gönderildi.`,
        data: { inspectionId, type: 'flow_completed' },
      },
    });
  }

  return true;
}

export async function handleInspectionCompleted(inspectionId: string): Promise<void> {
  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId },
    include: {
      branch: { include: { manager: true } },
      responses: {
        include: {
          checklistItem: true,
        }
      },
    },
  });

  if (!inspection) return;

  const criticalDeficiencies = inspection.responses.filter(r => {
    const item = r.checklistItem;
    if (!item.isCritical) return false;
    if (item.itemType === 'boolean' && r.passed === false) return true;
    if (item.itemType === 'score' && r.score !== null && r.score < item.maxScore * 0.5) return true;
    return false;
  });

  if (criticalDeficiencies.length === 0) {
    await checkAndFinalizeInspection(inspectionId);
  } else {
    if (inspection.branch.managerId) {
      await prisma.notification.create({
        data: {
          userId: inspection.branch.managerId,
          title: 'Yeni Denetim - Düzeltici Faaliyet Gerekli',
          body: `${inspection.branch.name} şubesinde ${criticalDeficiencies.length} kritik eksik tespit edildi. Düzeltici faaliyet eklemeniz gerekmektedir.`,
          data: { inspectionId, type: 'corrective_action_required', criticalCount: criticalDeficiencies.length },
        },
      });
    }

    const admins = await prisma.user.findMany({ where: { role: 'admin', isActive: true } });
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: 'Kritik Bulgular Tespit Edildi',
          body: `${inspection.branch.name} şubesinde ${criticalDeficiencies.length} kritik bulgu tespit edildi.`,
          data: { inspectionId, type: 'critical_findings', criticalCount: criticalDeficiencies.length },
        },
      });
    }
  }
}
