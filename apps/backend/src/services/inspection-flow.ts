import { prisma } from '../index';
import { generateInspectionPdfBuffer } from './pdf-generator';
import { sendEmail, getManagementEmails, buildEmailHtml } from './email';
import { logActivity } from './activity-logger';
import { createAndPushNotification } from './push-notification';

// Tek fonksiyon: Kritik eksiklikleri tespit et (duplicated kod birleşti)
function detectCriticalDeficiencies(responses: any[]): any[] {
  return responses.filter(r => {
    const item = r.checklistItem;
    if (!item || !item.isCritical) return false;
    // Boolean: passed === false veya yanıtsız (passed === null)
    if (item.itemType === 'boolean' && (r.passed === false || r.passed === null)) return true;
    // Score: %50'nin altında veya yanıtsız
    if (item.itemType === 'score') {
      if (r.score === null || r.score === undefined) return true;
      if (r.score < item.maxScore * 0.5) return true;
    }
    return false;
  });
}

export async function checkAndFinalizeInspection(inspectionId: string, nonCriticalCount?: number): Promise<boolean> {
  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId },
    include: {
      branch: { include: { manager: true } },
      inspector: {
        select: { id: true, fullName: true, email: true, emailNotifications: true },
      },
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

  const criticalDeficiencies = detectCriticalDeficiencies(inspection.responses);

  // Kritik eksik varsa ve hepsi kapatılmamışsa bekle
  if (criticalDeficiencies.length > 0) {
    const allCriticalsCovered = criticalDeficiencies.every(deficiency => {
      const action = inspection.actions.find(a => a.responseId === deficiency.id);
      return action && action.evidencePhotoPath;
    });
    if (!allCriticalsCovered) {
      return false;
    }
  }

  // Buraya geldi = ya kritik yok ya da hepsi kapatıldı -> finalize et

  // PDF oluştur ve mail gönder - başarısız olursa reviewed yapma
  let pdfSuccess = true;
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
    const managementEmails = await getManagementEmails();

    if (managementEmails.length > 0) {
      const completedDate = inspection.completedAt
        ? new Date(inspection.completedAt).toLocaleDateString('tr-TR')
        : new Date().toLocaleDateString('tr-TR');

      const deficiencyNote = nonCriticalCount && nonCriticalCount > 0
        ? ` (${nonCriticalCount} eksiklik mevcut)`
        : '';

      const nonCriticalHtml = nonCriticalCount && nonCriticalCount > 0
        ? `<p style="color:#E65100;font-weight:600;">&#9888; ${nonCriticalCount} adet kritik olmayan eksiklik tespit edilmistir.</p>`
        : '';

      await sendEmail({
        to: managementEmails,
        subject: `ERTANSA Denetim Raporu - ${inspection.branch.name} - ${completedDate}${deficiencyNote}`,
        html: buildEmailHtml(
          'Denetim Raporu',
          `<p><strong>${inspection.branch.name}</strong> subesinde yapilan denetim tamamlanmistir.</p>
           <p>Genel Puan: <strong>%${Math.round(Number(inspection.scorePercentage || 0))}</strong></p>
           ${nonCriticalHtml}
           <p>Detayli rapor ekte sunulmustur.</p>`,
        ),
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
    pdfSuccess = false;
    // PDF başarısız olsa bile denetimi reviewed yap - rapor sonra tekrar oluşturulabilir
  }

  // Denetimi reviewed olarak işaretle
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
    details: {
      branchName: inspection.branch.name,
      scorePercentage: inspection.scorePercentage,
      pdfGenerated: pdfSuccess,
    },
  });

  // Admin bildirim + push
  const admins = await prisma.user.findMany({ where: { role: 'admin', isActive: true } });
  for (const admin of admins) {
    await createAndPushNotification(
      admin.id,
      'Denetim Süreci Tamamlandı',
      `${inspection.branch.name} şubesindeki denetim süreci tamamlandı.${pdfSuccess ? ' Rapor üst yönetime gönderildi.' : ' Rapor oluşturulamadı.'}`,
      { inspectionId, type: 'flow_completed' },
    );
  }

  // Denetçiye bilgilendirme maili
  if (inspection.inspector?.emailNotifications && inspection.inspector?.email) {
    await sendEmail({
      to: inspection.inspector.email,
      subject: `ERTANSA - Denetiminiz Onaylandı: ${inspection.branch.name}`,
      html: buildEmailHtml(
        'Denetiminiz Onaylandı',
        `<p>Sayın <strong>${inspection.inspector.fullName}</strong>,</p>
         <p><strong>${inspection.branch.name}</strong> şubesinde gerçekleştirdiğiniz denetim süreci tamamlanmış ve onaylanmıştır.</p>
         <p>Genel Puan: <strong>%${Math.round(Number(inspection.scorePercentage || 0))}</strong></p>
         <p>Detaylı bilgi için sisteme giriş yapabilirsiniz.</p>`,
      ),
    }).catch(() => {});
  }

  // Müdüre bilgilendirme maili
  if (inspection.branch.managerId) {
    const mgr = await prisma.user.findUnique({
      where: { id: inspection.branch.managerId },
      select: { emailNotifications: true, email: true, fullName: true },
    });
    if (mgr?.emailNotifications && mgr?.email) {
      await sendEmail({
        to: mgr.email,
        subject: `ERTANSA - Denetim Süreci Tamamlandı: ${inspection.branch.name}`,
        html: buildEmailHtml(
          'Denetim Süreci Tamamlandı',
          `<p>Sayın <strong>${mgr.fullName}</strong>,</p>
           <p><strong>${inspection.branch.name}</strong> şubesindeki denetim süreci tamamlanmış ve onaylanmıştır.</p>
           <p>Genel Puan: <strong>%${Math.round(Number(inspection.scorePercentage || 0))}</strong></p>
           <p>Detaylı bilgi için sisteme giriş yapabilirsiniz.</p>`,
        ),
      }).catch(() => {});
    }
  }

  return true;
}

export async function handleInspectionCompleted(inspectionId: string): Promise<void> {
  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId },
    include: {
      branch: { include: { manager: true } },
      inspector: { select: { id: true, fullName: true } },
      responses: {
        include: { checklistItem: true },
      },
    },
  });

  if (!inspection) return;

  // Denetçiye "denetiminiz gönderildi" bildirimi
  if (inspection.inspectorId) {
    await createAndPushNotification(
      inspection.inspectorId,
      'Denetiminiz Gönderildi',
      `${inspection.branch.name} şubesindeki denetiminiz başarıyla gönderildi. Puan: %${Math.round(Number(inspection.scorePercentage || 0))}`,
      { inspectionId, type: 'inspection_submitted' },
    );
  }

  const criticalDeficiencies = detectCriticalDeficiencies(inspection.responses);

  // Kritik olmayan eksiklikleri de tespit et
  const nonCriticalDeficiencies = inspection.responses.filter(r => {
    const item = r.checklistItem;
    if (!item || item.isCritical) return false;
    if (item.itemType === 'boolean' && (r.passed === false || r.passed === null)) return true;
    if (item.itemType === 'score' && (r.score === null || r.score === undefined || r.score < item.maxScore * 0.5)) return true;
    return false;
  });

  if (criticalDeficiencies.length === 0) {
    // Kritik eksik yok -> hemen finalize et
    await checkAndFinalizeInspection(inspectionId, nonCriticalDeficiencies.length);

    // Kritik olmayan eksiklikler varsa müdürü bilgilendir
    if (nonCriticalDeficiencies.length > 0 && inspection.branch.managerId) {
      await createAndPushNotification(
        inspection.branch.managerId,
        'Denetim Tamamlandı - Eksiklikler Mevcut',
        `${inspection.branch.name} şubesindeki denetim tamamlandı ancak ${nonCriticalDeficiencies.length} adet kritik olmayan eksiklik tespit edildi. İncelemenizi rica ederiz.`,
        { inspectionId, type: 'non_critical_deficiencies', deficiencyCount: nonCriticalDeficiencies.length },
      );
    }
  } else {
    // Durumu pending_action yap
    await prisma.inspection.update({
      where: { id: inspectionId },
      data: { status: 'pending_action' },
    });

    // Şube müdürüne bildirim + push
    if (inspection.branch.managerId) {
      await createAndPushNotification(
        inspection.branch.managerId,
        'Yeni Denetim - Düzeltici Faaliyet Gerekli',
        `${inspection.branch.name} şubesinde ${criticalDeficiencies.length} kritik eksik tespit edildi. Düzeltici faaliyet eklemeniz gerekmektedir.`,
        { inspectionId, type: 'corrective_action_required', criticalCount: criticalDeficiencies.length },
      );
    }

    // Admin bildirim + push
    const admins = await prisma.user.findMany({ where: { role: 'admin', isActive: true } });
    for (const admin of admins) {
      await createAndPushNotification(
        admin.id,
        'Kritik Bulgular Tespit Edildi',
        `${inspection.branch.name} şubesinde ${criticalDeficiencies.length} kritik bulgu tespit edildi.`,
        { inspectionId, type: 'critical_findings', criticalCount: criticalDeficiencies.length },
      );
    }
  }
}
