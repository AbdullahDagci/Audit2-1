import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScoreIndicator } from '@/components/inspection/ScoreIndicator';
import { useInspectionStore } from '@/stores/inspection-store';
import { useAuthStore } from '@/stores/auth-store';

// Mock detayli veri
const mockData = {
  score: 78.5,
  branch: 'Merkez Magaza',
  categories: [
    {
      name: 'Raf Duzeni', weight: 1.0, percentage: 80,
      items: [
        { question: 'Raf etiketleri guncel mi?', passed: true, score: 10, maxScore: 10, critical: false, photoRequired: false, notes: '' },
        { question: 'Urunler duzenli yerlestirilmis mi?', passed: true, score: 10, maxScore: 10, critical: false, photoRequired: true, notes: '' },
        { question: 'Eksik urun var mi?', passed: false, score: 0, maxScore: 10, critical: false, photoRequired: true, notes: 'Sut reyonunda 3 urun eksik' },
        { question: 'Raf temizligi yapilmis mi?', passed: true, score: 10, maxScore: 10, critical: false, photoRequired: false, notes: '' },
        { question: 'Urun gruplandirmasi dogru mu?', passed: true, score: 10, maxScore: 10, critical: false, photoRequired: false, notes: '' },
      ],
    },
    {
      name: 'Son Kullanma Tarihi', weight: 1.5, percentage: 75,
      items: [
        { question: 'SKT gecmis urun var mi?', passed: false, score: 0, maxScore: 10, critical: true, photoRequired: true, notes: 'Yogurt reyonunda 2 urun SKT gecmis' },
        { question: 'SKT si yaklasan urunler ayrilmis mi?', passed: true, score: 10, maxScore: 10, critical: false, photoRequired: false, notes: '' },
        { question: 'SKT kontrol kaydi tutulmus mu?', passed: true, score: 10, maxScore: 10, critical: false, photoRequired: false, notes: '' },
        { question: 'Tezgah urunlerinin SKT kontrol edilmis mi?', passed: true, score: 10, maxScore: 10, critical: false, photoRequired: false, notes: '' },
      ],
    },
    {
      name: 'Temizlik ve Hijyen', weight: 1.5, percentage: 60,
      items: [
        { question: 'Zemin temiz mi?', passed: true, score: 10, maxScore: 10, critical: false, photoRequired: true, notes: '' },
        { question: 'Tezgahlar temiz mi?', passed: false, score: 0, maxScore: 10, critical: true, photoRequired: true, notes: 'Et tezgahi kirli, fotograf eklendi' },
        { question: 'Cop kutulari bosaltilmis mi?', passed: true, score: 10, maxScore: 10, critical: false, photoRequired: false, notes: '' },
        { question: 'Sogutucu dolaplar temiz mi?', passed: false, score: 0, maxScore: 10, critical: true, photoRequired: true, notes: 'Ic temizlik yapılmamış' },
        { question: 'Tuvalet ve lavabo temiz mi?', passed: true, score: 10, maxScore: 10, critical: false, photoRequired: true, notes: '' },
        { question: 'Genel koku problemi var mi?', passed: true, score: 10, maxScore: 10, critical: false, photoRequired: false, notes: '' },
      ],
    },
    {
      name: 'Fiyat Etiketi', weight: 1.0, percentage: 100,
      items: [
        { question: 'Tum urunlerde fiyat etiketi var mi?', passed: true, score: 10, maxScore: 10, critical: false, photoRequired: false, notes: '' },
        { question: 'Etiket fiyatlari kasa fiyatiyla uyumlu mu?', passed: true, score: 10, maxScore: 10, critical: false, photoRequired: false, notes: '' },
        { question: 'Kampanya etiketleri guncel mi?', passed: true, score: 10, maxScore: 10, critical: false, photoRequired: false, notes: '' },
        { question: 'Etiketler okunakli mi?', passed: true, score: 10, maxScore: 10, critical: false, photoRequired: false, notes: '' },
      ],
    },
    {
      name: 'Personel', weight: 1.2, percentage: 90,
      items: [
        { question: 'Personel kiyafetleri uygun mu?', passed: true, score: 10, maxScore: 10, critical: false, photoRequired: true, notes: '' },
        { question: 'Isimlik takili mi?', passed: true, score: 10, maxScore: 10, critical: false, photoRequired: false, notes: '' },
        { question: 'Personel sayisi yeterli mi?', passed: true, score: 10, maxScore: 10, critical: false, photoRequired: false, notes: '' },
        { question: 'Personel hijyen kurallarina uyuyor mu?', passed: true, score: 10, maxScore: 10, critical: false, photoRequired: false, notes: '' },
        { question: 'Musteriye karsi tutum uygun mu?', passed: null, score: 8, maxScore: 10, critical: false, photoRequired: false, notes: 'Genel olarak iyi' },
      ],
    },
  ],
};

function getColor(p: number) {
  if (p >= 75) return '#4CAF50';
  if (p >= 50) return '#FF9800';
  return '#F44336';
}

function generateDetailedPdf(branch: string, date: string, inspectorName: string) {
  const totalItems = mockData.categories.reduce((s, c) => s + c.items.length, 0);
  const passedItems = mockData.categories.reduce((s, c) => s + c.items.filter(i => i.passed === true).length, 0);
  const failedItems = mockData.categories.reduce((s, c) => s + c.items.filter(i => i.passed === false).length, 0);
  const criticalFails = mockData.categories.flatMap(c => c.items).filter(i => i.critical && i.passed === false);
  const raporNo = 'DNT-' + Date.now().toString().slice(-6);

  let categorySections = '';
  mockData.categories.forEach((cat, catIdx) => {
    const catEarned = cat.items.reduce((s, i) => s + i.score, 0);
    const catMax = cat.items.reduce((s, i) => s + i.maxScore, 0);
    const color = getColor(cat.percentage);

    let rows = '';
    cat.items.forEach((item, idx) => {
      const bg = idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA';
      const statusLabel = item.passed === true ? 'UYGUN' : item.passed === false ? 'UYGUN DEGIL' : item.score + '/' + item.maxScore;
      const statusBg = item.passed === true ? '#E8F5E9' : item.passed === false ? '#FFEBEE' : '#FFF8E1';
      const statusFg = item.passed === true ? '#2E7D32' : item.passed === false ? '#C62828' : '#E65100';
      const criticalMark = item.critical ? '<span style="background:#FFCCBC;color:#BF360C;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;margin-left:8px;">KRITIK</span>' : '';
      const noteText = item.notes ? '<div style="color:#666;font-size:12px;margin-top:4px;">Not: ' + item.notes + '</div>' : '';

      rows += `
        <tr style="background:${bg};">
          <td style="padding:12px 14px;border-bottom:1px solid #E0E0E0;width:30px;color:#999;font-size:13px;vertical-align:top;">${idx + 1}</td>
          <td style="padding:12px 14px;border-bottom:1px solid #E0E0E0;vertical-align:top;">
            <div style="font-size:14px;color:#212121;line-height:1.5;">${item.question}${criticalMark}</div>
            ${noteText}
          </td>
          <td style="padding:12px 14px;border-bottom:1px solid #E0E0E0;text-align:center;vertical-align:top;width:50px;">
            <span style="font-size:13px;font-weight:600;color:#424242;">${item.score}/${item.maxScore}</span>
          </td>
          <td style="padding:12px 14px;border-bottom:1px solid #E0E0E0;text-align:center;vertical-align:top;width:120px;">
            <span style="background:${statusBg};color:${statusFg};padding:4px 12px;border-radius:6px;font-size:12px;font-weight:700;white-space:nowrap;">${statusLabel}</span>
          </td>
        </tr>`;
    });

    categorySections += `
      <div style="margin-bottom:24px;page-break-inside:avoid;">
        <table style="width:100%;border-collapse:collapse;">
          <tr style="background:#2E7D32;">
            <td colspan="3" style="padding:12px 14px;color:#FFFFFF;font-size:15px;font-weight:700;">
              ${catIdx + 1}. ${cat.name}
              <span style="font-weight:400;font-size:12px;opacity:0.85;margin-left:8px;">(Agirlik: ${cat.weight})</span>
            </td>
            <td style="padding:12px 14px;text-align:right;">
              <span style="background:rgba(255,255,255,0.25);color:#FFFFFF;padding:4px 14px;border-radius:6px;font-size:15px;font-weight:700;">%${cat.percentage}</span>
            </td>
          </tr>
          <tr style="background:#F5F5F5;">
            <th style="padding:8px 14px;text-align:left;font-size:11px;color:#666;text-transform:uppercase;border-bottom:2px solid #E0E0E0;">No</th>
            <th style="padding:8px 14px;text-align:left;font-size:11px;color:#666;text-transform:uppercase;border-bottom:2px solid #E0E0E0;">Kontrol Maddesi</th>
            <th style="padding:8px 14px;text-align:center;font-size:11px;color:#666;text-transform:uppercase;border-bottom:2px solid #E0E0E0;">Puan</th>
            <th style="padding:8px 14px;text-align:center;font-size:11px;color:#666;text-transform:uppercase;border-bottom:2px solid #E0E0E0;">Sonuc</th>
          </tr>
          ${rows}
          <tr style="background:#F5F5F5;">
            <td colspan="2" style="padding:10px 14px;font-size:13px;font-weight:700;color:#424242;border-top:2px solid #BDBDBD;">Kategori Toplam</td>
            <td style="padding:10px 14px;text-align:center;font-size:14px;font-weight:700;color:#424242;border-top:2px solid #BDBDBD;">${catEarned}/${catMax}</td>
            <td style="padding:10px 14px;text-align:center;border-top:2px solid #BDBDBD;">
              <span style="background:${color};color:#FFFFFF;padding:4px 14px;border-radius:6px;font-size:14px;font-weight:700;">%${cat.percentage}</span>
            </td>
          </tr>
        </table>
      </div>`;
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        @page { size: A4; margin: 16mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Helvetica, Arial, sans-serif; color: #212121; font-size: 14px; line-height: 1.5; }
        table { width: 100%; border-collapse: collapse; }
      </style>
    </head>
    <body>

      <!-- ===== HEADER ===== -->
      <table style="margin-bottom:24px;">
        <tr>
          <td style="width:50%;">
            <div style="font-size:28px;font-weight:800;color:#2E7D32;letter-spacing:1px;">ERTANSA</div>
            <div style="font-size:13px;color:#666;margin-top:2px;">Gida Uretim ve Ticaret A.S.</div>
          </td>
          <td style="text-align:right;vertical-align:top;">
            <div style="font-size:11px;color:#999;text-transform:uppercase;">Rapor No</div>
            <div style="font-size:16px;font-weight:700;color:#212121;">${raporNo}</div>
          </td>
        </tr>
      </table>

      <div style="background:#2E7D32;color:#FFFFFF;padding:16px 20px;border-radius:8px;margin-bottom:24px;">
        <div style="font-size:20px;font-weight:700;text-align:center;letter-spacing:0.5px;">DENETIM VE KONTROL RAPORU</div>
      </div>

      <!-- ===== GENEL BILGILER ===== -->
      <table style="margin-bottom:24px;border:1px solid #E0E0E0;border-radius:8px;overflow:hidden;">
        <tr style="background:#F5F5F5;">
          <td style="padding:12px 16px;font-size:12px;color:#666;text-transform:uppercase;font-weight:600;width:25%;border-bottom:1px solid #E0E0E0;">Denetlenen Sube</td>
          <td style="padding:12px 16px;font-size:15px;font-weight:600;color:#212121;border-bottom:1px solid #E0E0E0;">${branch}</td>
          <td style="padding:12px 16px;font-size:12px;color:#666;text-transform:uppercase;font-weight:600;width:20%;border-bottom:1px solid #E0E0E0;">Tarih</td>
          <td style="padding:12px 16px;font-size:15px;font-weight:600;color:#212121;border-bottom:1px solid #E0E0E0;">${date}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;font-size:12px;color:#666;text-transform:uppercase;font-weight:600;">Denetçi</td>
          <td style="padding:12px 16px;font-size:15px;font-weight:600;color:#212121;">${inspectorName}</td>
          <td style="padding:12px 16px;font-size:12px;color:#666;text-transform:uppercase;font-weight:600;">Sablon</td>
          <td style="padding:12px 16px;font-size:15px;font-weight:600;color:#212121;">Mağaza Genel Denetim</td>
        </tr>
      </table>

      <!-- ===== PUAN OZETI ===== -->
      <table style="margin-bottom:24px;">
        <tr>
          <td style="text-align:center;padding:20px;border:3px solid ${getColor(mockData.score)};border-radius:12px;width:35%;">
            <div style="font-size:56px;font-weight:800;color:${getColor(mockData.score)};line-height:1;">${Math.round(mockData.score * 10) / 10}</div>
            <div style="font-size:14px;font-weight:600;color:${getColor(mockData.score)};margin-top:4px;">100 UZERINDEN</div>
            <div style="font-size:16px;font-weight:700;color:#424242;margin-top:8px;background:#F5F5F5;padding:6px;border-radius:6px;">
              ${mockData.score >= 90 ? 'MUKEMMEL' : mockData.score >= 75 ? 'IYI' : mockData.score >= 50 ? 'ORTA' : 'ZAYIF'}
            </div>
          </td>
          <td style="padding-left:24px;vertical-align:top;">
            <table style="border:1px solid #E0E0E0;border-radius:8px;overflow:hidden;">
              <tr style="background:#F5F5F5;">
                <th style="padding:10px 16px;text-align:left;font-size:12px;color:#666;text-transform:uppercase;">Gosterge</th>
                <th style="padding:10px 16px;text-align:center;font-size:12px;color:#666;text-transform:uppercase;">Sayi</th>
              </tr>
              <tr><td style="padding:10px 16px;font-size:14px;border-bottom:1px solid #EEE;">Toplam Kontrol Maddesi</td><td style="padding:10px 16px;text-align:center;font-size:16px;font-weight:700;border-bottom:1px solid #EEE;">${totalItems}</td></tr>
              <tr><td style="padding:10px 16px;font-size:14px;color:#2E7D32;border-bottom:1px solid #EEE;">Uygun</td><td style="padding:10px 16px;text-align:center;font-size:16px;font-weight:700;color:#2E7D32;border-bottom:1px solid #EEE;">${passedItems}</td></tr>
              <tr><td style="padding:10px 16px;font-size:14px;color:#C62828;border-bottom:1px solid #EEE;">Uygun Degil</td><td style="padding:10px 16px;text-align:center;font-size:16px;font-weight:700;color:#C62828;border-bottom:1px solid #EEE;">${failedItems}</td></tr>
              <tr><td style="padding:10px 16px;font-size:14px;color:#E65100;">Kritik Bulgu</td><td style="padding:10px 16px;text-align:center;font-size:16px;font-weight:700;color:#E65100;">${criticalFails.length}</td></tr>
            </table>
          </td>
        </tr>
      </table>

      ${criticalFails.length > 0 ? `
        <!-- ===== KRITIK BULGULAR ===== -->
        <div style="background:#FFEBEE;border:2px solid #EF9A9A;border-radius:8px;padding:16px 20px;margin-bottom:24px;page-break-inside:avoid;">
          <div style="font-size:16px;font-weight:700;color:#B71C1C;margin-bottom:10px;">KRITIK BULGULAR</div>
          <table>
            <tr style="background:#FFCDD2;">
              <th style="padding:8px 12px;text-align:left;font-size:11px;color:#B71C1C;text-transform:uppercase;">Kontrol Maddesi</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;color:#B71C1C;text-transform:uppercase;">Aciklama</th>
            </tr>
            ${criticalFails.map(f => `
              <tr>
                <td style="padding:10px 12px;font-size:13px;color:#C62828;font-weight:600;border-bottom:1px solid #FFCDD2;">${f.question}</td>
                <td style="padding:10px 12px;font-size:13px;color:#424242;border-bottom:1px solid #FFCDD2;">${f.notes || 'Aciklama girilmemis'}</td>
              </tr>`).join('')}
          </table>
        </div>
      ` : ''}

      <!-- ===== KATEGORI OZET TABLOSU ===== -->
      <div style="margin-bottom:24px;page-break-inside:avoid;">
        <div style="font-size:16px;font-weight:700;color:#212121;margin-bottom:10px;padding-bottom:6px;border-bottom:3px solid #2E7D32;">KATEGORI BAZLI OZET</div>
        <table style="border:1px solid #E0E0E0;">
          <tr style="background:#2E7D32;">
            <th style="padding:10px 14px;text-align:left;font-size:12px;color:#FFFFFF;text-transform:uppercase;">Kategori</th>
            <th style="padding:10px 14px;text-align:center;font-size:12px;color:#FFFFFF;text-transform:uppercase;">Agirlik</th>
            <th style="padding:10px 14px;text-align:center;font-size:12px;color:#FFFFFF;text-transform:uppercase;">Madde</th>
            <th style="padding:10px 14px;text-align:center;font-size:12px;color:#FFFFFF;text-transform:uppercase;">Puan</th>
          </tr>
          ${mockData.categories.map((c, i) => {
            const bg = i % 2 === 0 ? '#FFFFFF' : '#FAFAFA';
            const cl = getColor(c.percentage);
            const earned = c.items.reduce((s, x) => s + x.score, 0);
            const max = c.items.reduce((s, x) => s + x.maxScore, 0);
            return `<tr style="background:${bg};">
              <td style="padding:10px 14px;font-size:14px;font-weight:600;color:#333;border-bottom:1px solid #E0E0E0;">${c.name}</td>
              <td style="padding:10px 14px;text-align:center;font-size:13px;color:#666;border-bottom:1px solid #E0E0E0;">${c.weight}</td>
              <td style="padding:10px 14px;text-align:center;font-size:13px;color:#666;border-bottom:1px solid #E0E0E0;">${earned}/${max}</td>
              <td style="padding:10px 14px;text-align:center;border-bottom:1px solid #E0E0E0;"><span style="background:${cl};color:#FFF;padding:4px 14px;border-radius:6px;font-size:14px;font-weight:700;">%${c.percentage}</span></td>
            </tr>`;
          }).join('')}
        </table>
      </div>

      <!-- ===== DETAYLI MADDELER ===== -->
      <div style="font-size:16px;font-weight:700;color:#212121;margin-bottom:14px;padding-bottom:6px;border-bottom:3px solid #2E7D32;">DETAYLI DENETIM SONUCLARI</div>
      ${categorySections}

      <!-- ===== IMZA ALANI ===== -->
      <div style="margin-top:36px;page-break-inside:avoid;">
        <div style="font-size:16px;font-weight:700;color:#212121;margin-bottom:16px;padding-bottom:6px;border-bottom:3px solid #2E7D32;">ONAY VE IMZA</div>
        <table style="border:1px solid #E0E0E0;">
          <tr style="background:#F5F5F5;">
            <th style="padding:10px;text-align:center;font-size:12px;color:#666;text-transform:uppercase;width:33%;border-right:1px solid #E0E0E0;">Denetçi</th>
            <th style="padding:10px;text-align:center;font-size:12px;color:#666;text-transform:uppercase;width:33%;border-right:1px solid #E0E0E0;">Şube Müdürü</th>
            <th style="padding:10px;text-align:center;font-size:12px;color:#666;text-transform:uppercase;width:33%;">Genel Müdür</th>
          </tr>
          <tr>
            <td style="padding:16px;text-align:center;height:100px;vertical-align:bottom;border-right:1px solid #E0E0E0;border-bottom:1px solid #E0E0E0;">
              <div style="border-bottom:2px solid #333;margin:0 20px;"></div>
            </td>
            <td style="padding:16px;text-align:center;height:100px;vertical-align:bottom;border-right:1px solid #E0E0E0;border-bottom:1px solid #E0E0E0;">
              <div style="border-bottom:2px solid #333;margin:0 20px;"></div>
            </td>
            <td style="padding:16px;text-align:center;height:100px;vertical-align:bottom;border-bottom:1px solid #E0E0E0;">
              <div style="border-bottom:2px solid #333;margin:0 20px;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:10px;text-align:center;border-right:1px solid #E0E0E0;">
              <div style="font-size:13px;font-weight:600;color:#333;">${inspectorName}</div>
              <div style="font-size:12px;color:#999;">Tarih: ${date}</div>
            </td>
            <td style="padding:10px;text-align:center;border-right:1px solid #E0E0E0;">
              <div style="font-size:13px;font-weight:600;color:#333;">Ad Soyad</div>
              <div style="font-size:12px;color:#999;">Tarih: __ / __ / ____</div>
            </td>
            <td style="padding:10px;text-align:center;">
              <div style="font-size:13px;font-weight:600;color:#333;">Ad Soyad</div>
              <div style="font-size:12px;color:#999;">Tarih: __ / __ / ____</div>
            </td>
          </tr>
        </table>
      </div>

      <!-- ===== FOOTER ===== -->
      <div style="margin-top:24px;padding-top:12px;border-top:2px solid #E0E0E0;text-align:center;">
        <div style="font-size:11px;color:#999;">Bu rapor ERTANSA Denetim ve Kontrol Sistemi tarafından otomatik oluşturulmustur.</div>
        <div style="font-size:11px;color:#BDBDBD;margin-top:4px;">Rapor No: ${raporNo} | Tarih: ${date} | ERTANSA Gida Uretim ve Ticaret A.S. © 2026</div>
      </div>

    </body>
    </html>
  `;
}

export default function InspectionSummaryScreen() {
  const router = useRouter();
  const { branchName, locationVerified, resetInspection } = useInspectionStore();
  const user = useAuthStore((s) => s.user);
  const inspectorName = user?.fullName || 'Denetçi';
  const [pdfLoading, setPdfLoading] = useState(false);
  const [signedPdf, setSignedPdf] = useState<string | null>(null);

  const branch = branchName || mockData.branch;
  const date = new Date().toLocaleDateString('tr-TR');
  const criticalFails = mockData.categories.flatMap(c => c.items).filter(i => i.critical && i.passed === false);

  const handlePdfPreview = async () => {
    setPdfLoading(true);
    try {
      await Print.printAsync({ html: generateDetailedPdf(branch, date, inspectorName) });
    } catch (err) {
      console.log('PDF hata:', err);
    }
    setPdfLoading(false);
  };

  const handlePdfShare = async () => {
    setPdfLoading(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: generateDetailedPdf(branch, date, inspectorName) });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Denetim Raporu',
        UTI: 'com.adobe.pdf',
      });
    } catch (err) {
      console.log('PDF share hata:', err);
    }
    setPdfLoading(false);
  };

  const handleUploadSigned = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const file = result.assets[0];
        setSignedPdf(file.name);
        Alert.alert(
          'Imzali PDF Yuklendi',
          `${file.name} başarıyla yuklendi. Boyut: ${Math.round((file.size || 0) / 1024)} KB`,
          [{ text: 'Tamam' }]
        );
        // TODO: API'ye yukle
        // await api.uploadSignedPdf(inspectionId, file.uri);
      }
    } catch (err) {
      console.log('Upload hata:', err);
    }
  };

  const handleDone = () => {
    resetInspection();
    router.replace('/(tabs)');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Puan */}
      <View style={styles.scoreSection}>
        <ScoreIndicator percentage={mockData.score} size="lg" />
        <Text style={styles.branchName}>{branch}</Text>
        <Text style={styles.date}>{date}</Text>
      </View>

      {/* PDF Butonlari */}
      <View style={styles.pdfRow}>
        <TouchableOpacity style={styles.pdfBtn} onPress={handlePdfPreview} disabled={pdfLoading}>
          {pdfLoading ? <ActivityIndicator size="small" color="#2E7D32" /> : (
            <>
              <MaterialIcons name="picture-as-pdf" size={20} color="#2E7D32" />
              <Text style={styles.pdfBtnText}>PDF Onizle</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.pdfBtn} onPress={handlePdfShare} disabled={pdfLoading}>
          <MaterialIcons name="share" size={20} color="#2E7D32" />
          <Text style={styles.pdfBtnText}>PDF Paylas</Text>
        </TouchableOpacity>
      </View>

      {/* Imzali PDF Yukle */}
      <TouchableOpacity style={styles.uploadBtn} onPress={handleUploadSigned}>
        <MaterialIcons name="upload-file" size={22} color="#1565C0" />
        <View style={{ flex: 1 }}>
          <Text style={styles.uploadBtnText}>Imzali PDF Yukle</Text>
          <Text style={styles.uploadBtnSub}>
            {signedPdf ? `Yuklendi: ${signedPdf}` : 'Imzalanmis raporu sisteme yukleyin'}
          </Text>
        </View>
        {signedPdf && <MaterialIcons name="check-circle" size={22} color="#4CAF50" />}
      </TouchableOpacity>

      {/* Kritik Bulgular */}
      {criticalFails.length > 0 && (
        <Card style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#F44336' }]}>
          <View style={styles.criticalHeader}>
            <MaterialIcons name="warning" size={20} color="#F44336" />
            <Text style={styles.criticalTitle}>Kritik Bulgular ({criticalFails.length})</Text>
          </View>
          {criticalFails.map((f, i) => (
            <View key={i} style={{ marginBottom: 6 }}>
              <Text style={{ fontSize: 14, color: '#333' }}>• {f.question}</Text>
              {f.notes ? <Text style={{ fontSize: 12, color: '#999', marginLeft: 14 }}>{f.notes}</Text> : null}
            </View>
          ))}
        </Card>
      )}

      {/* Kategori Ozeti */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Kategori Dagilimi</Text>
        {mockData.categories.map((cat) => (
          <View key={cat.name} style={styles.categoryRow}>
            <Text style={styles.categoryName}>{cat.name}</Text>
            <View style={styles.barContainer}>
              <View style={[styles.bar, { width: `${cat.percentage}%`, backgroundColor: getColor(cat.percentage) }]} />
            </View>
            <Text style={[styles.percentText, { color: getColor(cat.percentage) }]}>%{cat.percentage}</Text>
          </View>
        ))}
      </Card>

      {/* Detayli Maddeler */}
      {mockData.categories.map((cat, catIdx) => (
        <Card key={cat.name} style={styles.card}>
          <View style={styles.catHeader}>
            <Text style={styles.catHeaderText}>{catIdx + 1}. {cat.name}</Text>
            <Text style={[styles.catHeaderScore, { color: getColor(cat.percentage) }]}>%{cat.percentage}</Text>
          </View>
          {cat.items.map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              <MaterialIcons
                name={item.passed === true ? 'check-circle' : item.passed === false ? 'cancel' : 'radio-button-unchecked'}
                size={20}
                color={item.passed === true ? '#4CAF50' : item.passed === false ? '#F44336' : '#FF9800'}
              />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Text style={styles.itemText}>{item.question}</Text>
                  {item.critical && (
                    <View style={styles.criticalBadge}>
                      <Text style={styles.criticalBadgeText}>KRİTİK</Text>
                    </View>
                  )}
                </View>
                {item.notes ? <Text style={styles.itemNote}>Not: {item.notes}</Text> : null}
              </View>
              <Text style={[styles.itemScore, { color: item.passed === true ? '#4CAF50' : item.passed === false ? '#F44336' : '#FF9800' }]}>
                {item.score}/{item.maxScore}
              </Text>
            </View>
          ))}
        </Card>
      ))}

      {/* Konum */}
      <Card style={styles.card}>
        <View style={styles.infoRow}>
          <MaterialIcons name="location-on" size={18} color={locationVerified ? '#4CAF50' : '#FF9800'} />
          <Text style={styles.infoText}>Konum {locationVerified ? 'doğrulandı' : 'doğrulanamadı'}</Text>
          <Badge text={locationVerified ? 'Doğrulandı' : 'Dogrulanmadi'} variant={locationVerified ? 'success' : 'warning'} />
        </View>
      </Card>

      <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
        <Text style={styles.doneBtnText}>Tamamla</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, paddingBottom: 40 },
  scoreSection: { alignItems: 'center', marginBottom: 16, marginTop: 8 },
  branchName: { fontSize: 20, fontWeight: '600', color: '#212121', marginTop: 12 },
  date: { fontSize: 14, color: '#757575', marginTop: 4 },
  pdfRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  pdfBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#E8F5E9', borderRadius: 12, paddingVertical: 14, borderWidth: 1, borderColor: '#C8E6C9',
  },
  pdfBtnText: { fontSize: 14, fontWeight: '600', color: '#2E7D32' },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#E3F2FD', borderRadius: 12, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#BBDEFB',
  },
  uploadBtnText: { fontSize: 14, fontWeight: '600', color: '#1565C0' },
  uploadBtnSub: { fontSize: 11, color: '#64B5F6', marginTop: 2 },
  card: { marginBottom: 12, backgroundColor: '#FFF', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#212121', marginBottom: 12 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  categoryName: { width: 110, fontSize: 13, color: '#212121' },
  barContainer: { flex: 1, height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 4 },
  percentText: { width: 40, fontSize: 13, fontWeight: '600', textAlign: 'right' },
  criticalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  criticalTitle: { fontSize: 16, fontWeight: '600', color: '#F44336' },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  catHeaderText: { fontSize: 15, fontWeight: '600', color: '#212121' },
  catHeaderScore: { fontSize: 15, fontWeight: '700' },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F8F8F8' },
  itemText: { fontSize: 13, color: '#333', lineHeight: 20 },
  itemNote: { fontSize: 11, color: '#999', fontStyle: 'italic', marginTop: 2 },
  itemScore: { fontSize: 13, fontWeight: '600', minWidth: 40, textAlign: 'right' },
  criticalBadge: { backgroundColor: '#FFF3E0', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, marginLeft: 6 },
  criticalBadgeText: { fontSize: 9, fontWeight: '700', color: '#E65100' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { flex: 1, fontSize: 14, color: '#212121' },
  doneBtn: { backgroundColor: '#2E7D32', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  doneBtnText: { fontSize: 17, fontWeight: '600', color: '#FFF' },
});
