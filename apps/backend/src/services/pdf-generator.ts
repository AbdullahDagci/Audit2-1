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

// Upload dizininin base path'i (proje k\u00f6k\u00fcne g\u00f6re)
const UPLOADS_BASE_PATH = path.join(__dirname, '../../');

function getScoreColor(percentage: number): string {
  if (percentage >= 75) return '#4CAF50';
  if (percentage >= 50) return '#FF9800';
  return '#F44336';
}

function getScoreLabel(percentage: number): string {
  if (percentage >= 90) return 'M\u00fckemmel';
  if (percentage >= 75) return '\u0130yi';
  if (percentage >= 50) return 'Orta';
  if (percentage >= 25) return 'Zay\u0131f';
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

/**
 * Dosya yolundan foto\u011fraf\u0131 okuyup base64 data URI olarak d\u00f6nd\u00fcr\u00fcr.
 * Dosya bulunamazsa veya okunamazsa null d\u00f6ner -- PDF bozulmaz.
 */
function readPhotoAsBase64(storagePath: string): string | null {
  try {
    const absolutePath = path.join(UPLOADS_BASE_PATH, storagePath);
    if (!fs.existsSync(absolutePath)) return null;

    const fileContent = fs.readFileSync(absolutePath);
    const base64 = Buffer.from(fileContent).toString('base64');

    // Uzant\u0131ya g\u00f6re MIME type belirle
    const ext = path.extname(storagePath).toLowerCase();
    let mime = 'image/jpeg';
    if (ext === '.png') mime = 'image/png';
    else if (ext === '.gif') mime = 'image/gif';
    else if (ext === '.webp') mime = 'image/webp';

    return `data:${mime};base64,${base64}`;
  } catch {
    // Dosya okunamad\u0131 -- sessizce ge\u00e7
    return null;
  }
}

/**
 * Bir response'a ait foto\u011fraflar\u0131 HTML olarak \u00fcretir.
 * Max 3 foto\u011fraf g\u00f6sterir, fazlas\u0131 i\u00e7in "+X foto\u011fraf daha" yazar.
 */
function buildResponsePhotosHtml(photos: any[]): string {
  if (!photos || photos.length === 0) return '';

  const MAX_DISPLAY = 3;
  const photosToShow = photos.slice(0, MAX_DISPLAY);
  const remainingCount = photos.length - MAX_DISPLAY;

  let imagesHtml = '';
  for (const photo of photosToShow) {
    if (!photo.storagePath) continue;
    const dataUri = readPhotoAsBase64(photo.storagePath);
    if (!dataUri) continue;

    imagesHtml += `<img src="${dataUri}" style="max-width:200px;max-height:150px;border-radius:4px;margin:4px;object-fit:cover;" />`;
  }

  // Hi\u00e7bir foto\u011fraf okunamad\u0131ysa bo\u015f d\u00f6n
  if (!imagesHtml) return '';

  let html = `<div style="padding:6px 6px 2px;background:#fafafa;border:1px solid #eee;border-radius:4px;margin-top:4px;">
    <div style="font-size:10px;color:#888;margin-bottom:4px;">Denetim Foto\u011fraflar\u0131:</div>
    <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:flex-start;">${imagesHtml}</div>`;

  if (remainingCount > 0) {
    html += `<div style="font-size:10px;color:#999;margin-top:4px;">+${remainingCount} foto\u011fraf daha</div>`;
  }

  html += '</div>';
  return html;
}

/**
 * D\u00fczeltici faaliyet kan\u0131t foto\u011fraf\u0131n\u0131 HTML olarak \u00fcretir.
 */
function buildEvidencePhotoHtml(evidencePhotoPath: string | null | undefined): string {
  if (!evidencePhotoPath) return '';

  const dataUri = readPhotoAsBase64(evidencePhotoPath);
  if (!dataUri) return '';

  return `<div style="margin-top:6px;padding:6px;background:#E8F5E9;border-radius:4px;border:1px solid #C8E6C9;">
    <div style="font-size:10px;color:#2E7D32;margin-bottom:4px;">Kan\u0131t Foto\u011fraf\u0131:</div>
    <img src="${dataUri}" style="max-width:250px;max-height:180px;border-radius:4px;object-fit:cover;" />
  </div>`;
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
      const isCritical = item?.isCritical ? '<span style="color:#F44336;font-weight:bold;">[KR\u0130T\u0130K]</span> ' : '';
      const status = r.passed === true ? '\u2705 Uygun' : r.passed === false ? '\u274c Uygun De\u011fil' : `${r.score || 0}/${item?.maxScore || 0}`;
      const photosHtml = buildResponsePhotosHtml(r.photos);
      return `<tr>
        <td style="padding:6px;border:1px solid #ddd;">
          ${isCritical}${item?.questionText || ''}
          ${photosHtml}
        </td>
        <td style="padding:6px;border:1px solid #ddd;text-align:center;vertical-align:top;">${status}</td>
        <td style="padding:6px;border:1px solid #ddd;vertical-align:top;">${r.notes || ''}</td>
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
      const evidenceStatus = action.evidencePhotoPath ? '\u2705 Kan\u0131t Y\u00fcklendi' : '\u23f3 Kan\u0131t Bekleniyor';
      const evidencePhotoHtml = buildEvidencePhotoHtml(action.evidencePhotoPath);
      return `<div style="background:${bgColor};padding:10px;margin-bottom:8px;border-radius:4px;border-left:4px solid ${action.isCritical ? '#F44336' : '#FF9800'};">
        <strong>${action.response?.checklistItem?.questionText || 'Madde'}</strong>
        ${action.isCritical ? '<span style="color:#F44336;"> [KR\u0130T\u0130K]</span>' : ''}
        <br><strong>D\u00fczeltici Faaliyet:</strong> ${action.description}
        <br><strong>Durum:</strong> ${evidenceStatus}
        ${action.evidenceNotes ? `<br><strong>Kan\u0131t Notu:</strong> ${action.evidenceNotes}` : ''}
        <br><small>Ekleyen: ${action.createdBy?.fullName || '-'} | Tarih: ${formatDate(action.createdAt)}</small>
        ${evidencePhotoHtml}
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
    <div class="subtitle">DEN\u0130T\u0130M VE D\u00dcZELT\u0130C\u0130 FAAL\u0130YET RAPORU</div>
    <div style="font-size:11px;color:#999;">Rapor No: ${reportNo} | Tarih: ${formatDate(now)}</div>
  </div>

  <div class="section-title">1. GENEL B\u0130LG\u0130LER</div>
  <div class="info-grid">
    <div class="info-box"><label>\u015eube</label><span>${branch?.name || '-'}</span></div>
    <div class="info-box"><label>Tesis T\u00fcr\u00fc</label><span>${branch?.facilityType || '-'}</span></div>
    <div class="info-box"><label>Denet\u00e7i</label><span>${inspector?.fullName || '-'}</span></div>
    <div class="info-box"><label>Denetim Tarihi</label><span>${formatDate(inspection.completedAt || inspection.createdAt)}</span></div>
    <div class="info-box"><label>\u015eablon</label><span>${template?.name || '-'}</span></div>
    <div class="info-box"><label>Konum Do\u011frulama</label><span>${inspection.locationVerified ? '\u2705 Do\u011fruland\u0131' : '\u274c Do\u011frulanmad\u0131'}</span></div>
  </div>

  <div class="section-title">2. PUAN \u00d6ZET\u0130</div>
  <div class="score-box" style="background:${scoreColor}20;border:2px solid ${scoreColor};">
    <div style="font-size:36px;font-weight:bold;color:${scoreColor};">%${Math.round(scorePercentage)}</div>
    <div style="font-size:16px;color:${scoreColor};">${scoreLabel}</div>
    <div style="font-size:12px;color:#666;margin-top:5px;">
      Toplam: ${inspection.totalScore || 0}/${inspection.maxPossibleScore || 0} puan |
      Kritik Bulgu: ${criticalFindings.length} adet
    </div>
  </div>

  <div class="section-title">3. KR\u0130T\u0130K BULGULAR</div>
  ${criticalFindings.length > 0 ? criticalFindings.map((r: any) => `
    <div style="background:#FFEBEE;padding:8px;margin-bottom:5px;border-left:4px solid #F44336;border-radius:4px;">
      <strong>${r.checklistItem?.questionText || ''}</strong>
      ${r.notes ? `<br><em>Not: ${r.notes}</em>` : ''}
    </div>
  `).join('') : '<p style="color:#4CAF50;">Kritik bulgu tespit edilmemi\u015ftir.</p>'}

  <div class="section-title">4. DETAYLI DEN\u0130T\u0130M SONU\u00c7LARI</div>
  ${categoriesHtml}

  <div class="section-title">5. D\u00dcZELT\u0130C\u0130 FAAL\u0130YETLER</div>
  ${correctiveActions.length > 0 ? correctiveHtml : '<p>D\u00fczeltici faaliyet bulunmamaktad\u0131r.</p>'}

  <div class="section-title">6. SONU\u00c7</div>
  <p>${branch?.name || ''} \u015fubesinde yap\u0131lan denetim sonucunda genel puan <strong>%${Math.round(scorePercentage)}</strong> (${scoreLabel}) olarak belirlenmi\u015ftir.
  ${criticalFindings.length > 0 ? `Toplamda <strong>${criticalFindings.length} kritik bulgu</strong> tespit edilmi\u015f olup d\u00fczeltici faaliyetler ba\u015flat\u0131lm\u0131\u015ft\u0131r.` : 'Kritik bulgu tespit edilmemi\u015ftir.'}</p>

  <div class="footer">
    <div class="signature-grid">
      <div class="signature-box">
        <div class="signature-line">Denet\u00e7i</div>
        <div>${inspector?.fullName || ''}</div>
      </div>
      <div class="signature-box">
        <div class="signature-line">\u015eube Sorumlusu</div>
        <div>${branch?.manager?.fullName || ''}</div>
      </div>
      <div class="signature-box">
        <div class="signature-line">\u00dcst Y\u00f6netim</div>
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
