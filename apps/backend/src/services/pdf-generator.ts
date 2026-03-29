import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { LOGO_BASE64 } from '../assets/logo-base64';

interface InspectionPdfData {
  inspection: any;
  branch: any;
  inspector: any;
  template: any;
  responses: any[];
  categories: any[];
  correctiveActions: any[];
  tutanaklar?: any[];
}

function getScoreColor(percentage: number): string {
  if (percentage >= 75) return '#4CAF50';
  if (percentage >= 50) return '#FF9800';
  return '#F44336';
}

function getScoreLabel(percentage: number): string {
  if (percentage >= 90) return 'Mükemmel';
  if (percentage >= 75) return 'İyi';
  if (percentage >= 50) return 'Orta';
  if (percentage >= 25) return 'Zayıf';
  return 'Kritik';
}

function formatDate(dateStr: string | Date | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function generateReportNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `DNT-${year}${month}-${random}`;
}

function buildHtmlReport(data: InspectionPdfData): string {
  const { inspection, branch, inspector, template, responses, categories, correctiveActions } = data;
  const scorePercentage = Number(inspection.scorePercentage || 0);
  const scoreColor = getScoreColor(scorePercentage);
  const scoreLabel = getScoreLabel(scorePercentage);
  const reportNo = generateReportNumber();
  const now = new Date();

  const criticalFindings = responses.filter((r: any) => r.checklistItem?.isCritical && r.passed === false);

  let categoriesHtml = '';
  for (const cat of categories) {
    const catResponses = responses.filter((r: any) => r.checklistItem?.categoryId === cat.id);
    const earned = catResponses.reduce((sum: number, r: any) => sum + (r.score || 0), 0);
    const maxScore = catResponses.reduce((sum: number, r: any) => sum + (r.checklistItem?.maxScore || 0), 0);
    const pct = maxScore > 0 ? Math.round((earned / maxScore) * 100) : 0;

    let itemsHtml = catResponses.map((r: any) => {
      const item = r.checklistItem;
      const isCritical = item?.isCritical ? '<span style="color:#F44336;font-weight:bold;">[KRİTİK]</span> ' : '';
      const status = r.passed === true ? '✅ Uygun' : r.passed === false ? '❌ Uygun Değil' : `${r.score || 0}/${item?.maxScore || 0}`;
      return `<tr>
        <td style="padding:6px;border:1px solid #ddd;">${isCritical}${item?.questionText || ''}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:center;">${status}</td>
        <td style="padding:6px;border:1px solid #ddd;">${r.notes || ''}</td>
      </tr>`;
    }).join('');

    categoriesHtml += `
      <div style="margin-bottom:20px;">
        <h3 style="background:#f5f5f5;padding:8px;margin:0;border-left:4px solid ${getScoreColor(pct)};">
          ${cat.name} - %${pct} (${earned}/${maxScore})
        </h3>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr style="background:#e8e8e8;">
            <th style="padding:6px;border:1px solid #ddd;text-align:left;">Madde</th>
            <th style="padding:6px;border:1px solid #ddd;width:100px;">Durum</th>
            <th style="padding:6px;border:1px solid #ddd;width:150px;">Not</th>
          </tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
      </div>`;
  }

  let correctiveHtml = '';
  if (correctiveActions.length > 0) {
    correctiveHtml = correctiveActions.map((action: any) => {
      const bgColor = action.isCritical ? '#FFEBEE' : '#FFF3E0';
      const evidenceStatus = action.evidencePhotoPath ? '✅ Kanıt Yüklendi' : '⏳ Kanıt Bekleniyor';
      return `<div style="background:${bgColor};padding:10px;margin-bottom:8px;border-radius:4px;border-left:4px solid ${action.isCritical ? '#F44336' : '#FF9800'};">
        <strong>${action.response?.checklistItem?.questionText || 'Madde'}</strong>
        ${action.isCritical ? '<span style="color:#F44336;"> [KRİTİK]</span>' : ''}
        <br><strong>Düzeltici Faaliyet:</strong> ${action.description}
        <br><strong>Durum:</strong> ${evidenceStatus}
        ${action.evidenceNotes ? `<br><strong>Kanıt Notu:</strong> ${action.evidenceNotes}` : ''}
        <br><small>Ekleyen: ${action.createdBy?.fullName || '-'} | Tarih: ${formatDate(action.createdAt)}</small>
      </div>`;
    }).join('');
  }

  return `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; color: #333; font-size: 13px; }
  .header { text-align: center; border-bottom: 3px solid #2E7D32; padding-bottom: 15px; margin-bottom: 20px; }
  .header h1 { color: #2E7D32; margin: 5px 0; font-size: 20px; }
  .header .subtitle { color: #666; font-size: 14px; }
  .info-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; }
  .info-box { flex: 1; min-width: 200px; background: #f9f9f9; padding: 10px; border-radius: 4px; border: 1px solid #e0e0e0; }
  .info-box label { font-weight: bold; color: #555; font-size: 11px; text-transform: uppercase; }
  .info-box span { display: block; font-size: 14px; margin-top: 3px; }
  .score-box { text-align: center; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
  .section-title { background: #2E7D32; color: white; padding: 8px 12px; margin: 20px 0 10px; font-size: 14px; }
  .footer { margin-top: 30px; border-top: 2px solid #2E7D32; padding-top: 15px; }
  .signature-grid { display: flex; justify-content: space-between; margin-top: 40px; }
  .signature-box { text-align: center; width: 30%; }
  .signature-line { border-top: 1px solid #333; margin-top: 50px; padding-top: 5px; }
</style></head>
<body>
  <div class="header">
    <img src="${LOGO_BASE64}" alt="ERTANSA" style="height:60px;margin-bottom:8px;" />
    <h1>ERTANSA</h1>
    <div class="subtitle">DENETİM VE DÜZELTİCİ FAALİYET RAPORU</div>
    <div style="font-size:11px;color:#999;">Rapor No: ${reportNo} | Tarih: ${formatDate(now)}</div>
  </div>

  <div class="section-title">1. GENEL BİLGİLER</div>
  <div class="info-grid">
    <div class="info-box"><label>Şube</label><span>${branch?.name || '-'}</span></div>
    <div class="info-box"><label>Tesis Türü</label><span>${branch?.facilityType || '-'}</span></div>
    <div class="info-box"><label>Denetçi</label><span>${inspector?.fullName || '-'}</span></div>
    <div class="info-box"><label>Denetim Tarihi</label><span>${formatDate(inspection.completedAt || inspection.createdAt)}</span></div>
    <div class="info-box"><label>Şablon</label><span>${template?.name || '-'}</span></div>
    <div class="info-box"><label>Konum Doğrulama</label><span>${inspection.locationVerified ? '✅ Doğrulandı' : '❌ Doğrulanmadı'}</span></div>
  </div>

  <div class="section-title">2. PUAN ÖZETİ</div>
  <div class="score-box" style="background:${scoreColor}20;border:2px solid ${scoreColor};">
    <div style="font-size:36px;font-weight:bold;color:${scoreColor};">%${Math.round(scorePercentage)}</div>
    <div style="font-size:16px;color:${scoreColor};">${scoreLabel}</div>
    <div style="font-size:12px;color:#666;margin-top:5px;">
      Toplam: ${inspection.totalScore || 0}/${inspection.maxPossibleScore || 0} puan |
      Kritik Bulgu: ${criticalFindings.length} adet
    </div>
  </div>

  <div class="section-title">3. KRİTİK BULGULAR</div>
  ${criticalFindings.length > 0 ? criticalFindings.map((r: any) => `
    <div style="background:#FFEBEE;padding:8px;margin-bottom:5px;border-left:4px solid #F44336;border-radius:4px;">
      <strong>${r.checklistItem?.questionText || ''}</strong>
      ${r.notes ? `<br><em>Not: ${r.notes}</em>` : ''}
    </div>
  `).join('') : '<p style="color:#4CAF50;">Kritik bulgu tespit edilmemiştir.</p>'}

  <div class="section-title">4. DETAYLI DENETİM SONUÇLARI</div>
  ${categoriesHtml}

  <div class="section-title">5. DÜZELTİCİ FAALİYETLER</div>
  ${correctiveActions.length > 0 ? correctiveHtml : '<p>Düzeltici faaliyet bulunmamaktadır.</p>'}

  <div class="section-title">6. SONUÇ</div>
  <p>${branch?.name || ''} şubesinde yapılan denetim sonucunda genel puan <strong>%${Math.round(scorePercentage)}</strong> (${scoreLabel}) olarak belirlenmiştir.
  ${criticalFindings.length > 0 ? `Toplamda <strong>${criticalFindings.length} kritik bulgu</strong> tespit edilmiş olup düzeltici faaliyetler başlatılmıştır.` : 'Kritik bulgu tespit edilmemiştir.'}</p>

  <div class="footer">
    <div class="signature-grid">
      <div class="signature-box">
        <div class="signature-line">Denetçi</div>
        <div>${inspector?.fullName || ''}</div>
      </div>
      <div class="signature-box">
        <div class="signature-line">Şube Sorumlusu</div>
        <div>${branch?.manager?.fullName || ''}</div>
      </div>
      <div class="signature-box">
        <div class="signature-line">Üst Yönetim</div>
        <div>&nbsp;</div>
      </div>
    </div>
  </div>
</body></html>`;
}

export async function generateInspectionPdfBuffer(data: InspectionPdfData): Promise<Buffer> {
  const html = buildHtmlReport(data);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '15mm', right: '10mm', bottom: '15mm', left: '10mm' },
      printBackground: true,
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

export function buildHtmlReportForEmail(data: InspectionPdfData): string {
  return buildHtmlReport(data);
}
