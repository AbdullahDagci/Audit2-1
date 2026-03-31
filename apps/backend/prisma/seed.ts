import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed başlatıyor...');

  // Admin kullanıcı oluştur
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ertansa.com' },
    update: {},
    create: {
      email: 'admin@ertansa.com',
      password: adminPassword,
      fullName: 'Admin Kullanıcı',
      role: 'admin',
      phone: '05001234567',
    },
  });

  // Denetçi kullanıcı
  const inspectorPassword = await bcrypt.hash('denetci123', 10);
  const inspector = await prisma.user.upsert({
    where: { email: 'denetci@ertansa.com' },
    update: {},
    create: {
      email: 'denetci@ertansa.com',
      password: inspectorPassword,
      fullName: 'Ahmet Yılmaz',
      role: 'inspector',
      phone: '05009876543',
    },
  });

  // Şube sorumlusu (manager) kullanıcı
  const managerPassword = await bcrypt.hash('mudur123', 10);
  const manager = await prisma.user.upsert({
    where: { email: 'mudur@ertansa.com' },
    update: {},
    create: {
      email: 'mudur@ertansa.com',
      password: managerPassword,
      fullName: 'Mehmet Demir',
      role: 'manager',
      phone: '05005551234',
    },
  });

  console.log('Kullanıcılar oluşturuldu');

  // Şubeler
  const branches = await Promise.all([
    prisma.branch.create({ data: { name: 'Merkez Mağaza', facilityType: 'magaza', address: 'Konya Merkez', city: 'Konya', latitude: 37.8746, longitude: 32.4932, managerId: manager.id } }),
    prisma.branch.create({ data: { name: 'Şube 2 Mağaza', facilityType: 'magaza', address: 'Selcuklu', city: 'Konya', latitude: 37.8850, longitude: 32.4800, managerId: manager.id } }),
    prisma.branch.create({ data: { name: 'Kesimhane', facilityType: 'kesimhane', address: 'Organize Sanayi', city: 'Konya', latitude: 37.9100, longitude: 32.5200 } }),
    prisma.branch.create({ data: { name: 'Ahır - Merkez', facilityType: 'ahir', address: 'Cihanbeyli Yolu', city: 'Konya', latitude: 37.8500, longitude: 32.4500 } }),
    prisma.branch.create({ data: { name: 'Yufka Üretim', facilityType: 'yufka', address: 'Karatay', city: 'Konya', latitude: 37.8600, longitude: 32.5100 } }),
    prisma.branch.create({ data: { name: 'Ana Depo', facilityType: 'depo', address: 'Organize Sanayi', city: 'Konya', latitude: 37.9050, longitude: 32.5150 } }),
  ]);

  console.log('Şubeler oluşturuldu');

  // MAGAZA SABLONU
  const magazaTemplate = await prisma.checklistTemplate.create({
    data: {
      facilityType: 'magaza',
      name: 'Mağaza Genel Denetim',
      totalMaxScore: 300,
      categories: {
        create: [
          {
            name: 'Raf Düzeni', sortOrder: 1, weight: 1.0,
            items: { create: [
              { questionText: 'Raf etiketleri güncel mi?', maxScore: 10, sortOrder: 1 },
              { questionText: 'Ürünler düzenli yerleştirilmiş mi?', maxScore: 10, photoRequired: true, sortOrder: 2 },
              { questionText: 'Eksik ürün var mı?', maxScore: 10, photoRequired: true, sortOrder: 3 },
              { questionText: 'Raf temizliği yapılmış mı?', maxScore: 10, sortOrder: 4 },
              { questionText: 'Ürün gruplandırması doğru mu?', maxScore: 10, sortOrder: 5 },
            ]},
          },
          {
            name: 'Son Kullanma Tarihi', sortOrder: 2, weight: 1.5,
            items: { create: [
              { questionText: 'SKT geçmiş ürün var mı?', maxScore: 10, isCritical: true, photoRequired: true, sortOrder: 1 },
              { questionText: 'SKT si yaklaşan ürünler ayrılmış mı?', maxScore: 10, sortOrder: 2 },
              { questionText: 'SKT kontrol kaydı tutulmuş mu?', maxScore: 10, sortOrder: 3 },
              { questionText: 'Tezgah ürünlerinin SKT kontrol edilmiş mi?', maxScore: 10, sortOrder: 4 },
            ]},
          },
          {
            name: 'Temizlik ve Hijyen', sortOrder: 3, weight: 1.5,
            items: { create: [
              { questionText: 'Zemin temiz mi?', maxScore: 10, photoRequired: true, sortOrder: 1 },
              { questionText: 'Tezgahlar temiz mi?', maxScore: 10, isCritical: true, photoRequired: true, sortOrder: 2 },
              { questionText: 'Çöp kutuları boşaltılmış mı?', maxScore: 10, sortOrder: 3 },
              { questionText: 'Soğutucu dolaplar temiz mi?', maxScore: 10, isCritical: true, photoRequired: true, sortOrder: 4 },
              { questionText: 'Tuvalet ve lavabo temiz mi?', maxScore: 10, photoRequired: true, sortOrder: 5 },
              { questionText: 'Genel koku problemi var mı?', maxScore: 10, sortOrder: 6 },
            ]},
          },
          {
            name: 'Fiyat Etiketi', sortOrder: 4, weight: 1.0,
            items: { create: [
              { questionText: 'Tüm ürünlerde fiyat etiketi var mı?', maxScore: 10, sortOrder: 1 },
              { questionText: 'Etiket fiyatları kasa fiyatıyla uyumlu mu?', maxScore: 10, sortOrder: 2 },
              { questionText: 'Kampanya etiketleri güncel mi?', maxScore: 10, sortOrder: 3 },
              { questionText: 'Etiketler okunaklı mı?', maxScore: 10, sortOrder: 4 },
            ]},
          },
          {
            name: 'Kasa Süreci', sortOrder: 5, weight: 0.8,
            items: { create: [
              { questionText: 'Kasa alanı düzenli mi?', maxScore: 10, sortOrder: 1 },
              { questionText: 'Poşet/çanta stoku yeterli mi?', maxScore: 10, sortOrder: 2 },
              { questionText: 'Para üstü hazır mı?', maxScore: 10, sortOrder: 3 },
              { questionText: 'Müşteri bekleme süresi uygun mu?', itemType: 'score', maxScore: 10, sortOrder: 4 },
            ]},
          },
          {
            name: 'Personel', sortOrder: 6, weight: 1.2,
            items: { create: [
              { questionText: 'Personel kıyafetleri uygun mu?', maxScore: 10, photoRequired: true, sortOrder: 1 },
              { questionText: 'İsimlik takılı mı?', maxScore: 10, sortOrder: 2 },
              { questionText: 'Personel sayısı yeterli mi?', maxScore: 10, sortOrder: 3 },
              { questionText: 'Personel hijyen kurallarına uyuyor mu?', maxScore: 10, sortOrder: 4 },
              { questionText: 'Müşteriye karşı tutum uygun mu?', itemType: 'score', maxScore: 10, sortOrder: 5 },
            ]},
          },
        ],
      },
    },
  });

  // KESIMHANE SABLONU
  await prisma.checklistTemplate.create({
    data: {
      facilityType: 'kesimhane', name: 'Kesimhane Genel Denetim', totalMaxScore: 250,
      categories: { create: [
        { name: 'Hijyen', sortOrder: 1, weight: 2.0, items: { create: [
          { questionText: 'Zemin temiz ve dezenfekte mi?', maxScore: 10, isCritical: true, photoRequired: true, sortOrder: 1 },
          { questionText: 'Ekipmanlar sterilize edilmiş mi?', maxScore: 10, isCritical: true, photoRequired: true, sortOrder: 2 },
          { questionText: 'Çalışma tezgahları temiz mi?', maxScore: 10, isCritical: true, sortOrder: 3 },
          { questionText: 'Lavabo ve el dezenfektanı mevcut mu?', maxScore: 10, sortOrder: 4 },
          { questionText: 'Atık alanı hijyenik mi?', maxScore: 10, photoRequired: true, sortOrder: 5 },
        ]}},
        { name: 'Soğuk Zincir', sortOrder: 2, weight: 2.0, items: { create: [
          { questionText: 'Soğuk hava deposu sıcaklığı uygun mu?', maxScore: 10, isCritical: true, photoRequired: true, sortOrder: 1 },
          { questionText: 'Sıcaklık kayıtları tutuluyor mu?', maxScore: 10, isCritical: true, sortOrder: 2 },
          { questionText: 'Et ürünleri doğru sıcaklıkta muhafaza ediliyor mu?', maxScore: 10, photoRequired: true, sortOrder: 3 },
        ]}},
        { name: 'Koruyucu Ekipman', sortOrder: 3, weight: 1.5, items: { create: [
          { questionText: 'Eldiven kullanılıyor mu?', maxScore: 10, photoRequired: true, sortOrder: 1 },
          { questionText: 'Bone/kep takılı mı?', maxScore: 10, photoRequired: true, sortOrder: 2 },
          { questionText: 'Önlük giyilmiş mi?', maxScore: 10, sortOrder: 3 },
          { questionText: 'Çizme/galoş kullanılıyor mu?', maxScore: 10, sortOrder: 4 },
        ]}},
      ]},
    },
  });

  // ISG SABLONU
  await prisma.checklistTemplate.create({
    data: {
      facilityType: 'magaza', name: 'İş Sağlığı ve Güvenliği (ISG)', totalMaxScore: 300,
      categories: { create: [
        { name: 'Yangın Güvenliği', sortOrder: 1, weight: 2.0, items: { create: [
          { questionText: 'Yangın tüpleri kontrol edilmiş mi?', maxScore: 10, isCritical: true, photoRequired: true, sortOrder: 1 },
          { questionText: 'Tüp son kontrol tarihi uygun mu?', maxScore: 10, isCritical: true, photoRequired: true, sortOrder: 2 },
          { questionText: 'Yangın alarm sistemi çalışıyor mu?', maxScore: 10, sortOrder: 3 },
          { questionText: 'Yangın tatbikatı yapılmış mı?', maxScore: 10, sortOrder: 4 },
        ]}},
        { name: 'Acil Çıkışlar', sortOrder: 2, weight: 2.0, items: { create: [
          { questionText: 'Acil çıkış yolları açık mı?', maxScore: 10, isCritical: true, photoRequired: true, sortOrder: 1 },
          { questionText: 'Acil çıkış işaretleri aydınlatılmış mı?', maxScore: 10, isCritical: true, photoRequired: true, sortOrder: 2 },
          { questionText: 'Acil çıkış kapıları kilitli değil mi?', maxScore: 10, photoRequired: true, sortOrder: 3 },
          { questionText: 'Tahliye planı asılı mı?', maxScore: 10, photoRequired: true, sortOrder: 4 },
        ]}},
        { name: 'Elektrik Güvenliği', sortOrder: 3, weight: 1.5, items: { create: [
          { questionText: 'Elektrik panosu kapalı ve kilitli mi?', maxScore: 10, isCritical: true, photoRequired: true, sortOrder: 1 },
          { questionText: 'Açıkta kablo var mı?', maxScore: 10, photoRequired: true, sortOrder: 2 },
          { questionText: 'Topraklama kontrol edilmiş mi?', maxScore: 10, sortOrder: 3 },
        ]}},
        { name: 'Kişisel Koruyucu Ekipman', sortOrder: 4, weight: 1.5, items: { create: [
          { questionText: 'Personel uygun KKE kullanıyor mu?', maxScore: 10, photoRequired: true, sortOrder: 1 },
          { questionText: 'KKE stoku yeterli mi?', maxScore: 10, sortOrder: 2 },
          { questionText: 'KKE eğitimi verilmiş mi?', maxScore: 10, sortOrder: 3 },
        ]}},
        { name: 'Genel ISG', sortOrder: 5, weight: 1.0, items: { create: [
          { questionText: 'İlk yardım çantası mevcut ve dolu mu?', maxScore: 10, photoRequired: true, sortOrder: 1 },
          { questionText: 'İSG panosu güncel mi?', maxScore: 10, photoRequired: true, sortOrder: 2 },
          { questionText: 'Risk değerlendirmesi yapılmış mı?', maxScore: 10, sortOrder: 3 },
          { questionText: 'İş kazası kayıtları tutulmuş mu?', maxScore: 10, sortOrder: 4 },
        ]}},
      ]},
    },
  });

  console.log('Şablonlar oluşturuldu');

  // Sistem ayarları
  await prisma.systemSetting.upsert({
    where: { key: 'management_emails' },
    create: { key: 'management_emails', value: JSON.stringify(['abdullah.dagci@ertansa.com.tr']) },
    update: {},
  });
  console.log('Sistem ayarları oluşturuldu');

  // =============================================
  // GERÇEKÇI TEST VERİLERİ - DENETİMLER
  // =============================================
  const allTemplates = await prisma.checklistTemplate.findMany({
    include: { categories: { include: { items: true }, orderBy: { sortOrder: 'asc' } } },
  });
  const magazaTpl = allTemplates.find(t => t.name.includes('Mağaza Genel'));
  const kesimhaneTpl = allTemplates.find(t => t.facilityType === 'kesimhane');
  const isgTpl = allTemplates.find(t => t.name.includes('ISG'));

  if (magazaTpl && kesimhaneTpl) {
    // Helper: Rastgele tarih (son 60 gün içinde)
    const daysAgo = (n: number) => {
      const d = new Date();
      d.setDate(d.getDate() - n);
      return d;
    };

    // --- DENETİM 1: Merkez Mağaza - Tamamlanmış (reviewed), iyi puan ---
    const insp1 = await prisma.inspection.create({
      data: {
        branchId: branches[0].id,
        inspectorId: inspector.id,
        templateId: magazaTpl.id,
        status: 'reviewed',
        totalScore: 248,
        maxPossibleScore: 280,
        scorePercentage: 88.57,
        startedAt: daysAgo(45),
        completedAt: daysAgo(45),
        reviewedAt: daysAgo(43),
        locationVerified: true,
        latitude: 37.8746,
        longitude: 32.4932,
      },
    });

    // Yanıtlar - çoğu başarılı
    const insp1Items = magazaTpl.categories.flatMap(c => c.items);
    for (const item of insp1Items) {
      const isFail = item.isCritical && Math.random() < 0.1; // %10 kritik eksik
      await prisma.inspectionResponse.create({
        data: {
          inspectionId: insp1.id,
          checklistItemId: item.id,
          passed: item.itemType === 'boolean' ? !isFail : null,
          score: item.itemType === 'score' ? (isFail ? 3 : 8) : (isFail ? 0 : item.maxScore),
          notes: isFail ? 'Eksiklik tespit edildi' : null,
        },
      });
    }

    // --- DENETİM 2: Merkez Mağaza - Tamamlanmış (pending_action), kritik eksikler var ---
    const insp2 = await prisma.inspection.create({
      data: {
        branchId: branches[0].id,
        inspectorId: inspector.id,
        templateId: magazaTpl.id,
        status: 'pending_action',
        totalScore: 185,
        maxPossibleScore: 280,
        scorePercentage: 66.07,
        startedAt: daysAgo(7),
        completedAt: daysAgo(7),
        locationVerified: true,
        latitude: 37.8746,
        longitude: 32.4932,
      },
    });

    let criticalResponseIds: string[] = [];
    for (const item of insp1Items) {
      const isCriticalFail = item.isCritical; // Tüm kritik maddeler başarısız
      const isNormalFail = !item.isCritical && Math.random() < 0.3;
      const isFail = isCriticalFail || isNormalFail;
      const resp = await prisma.inspectionResponse.create({
        data: {
          inspectionId: insp2.id,
          checklistItemId: item.id,
          passed: item.itemType === 'boolean' ? !isFail : null,
          score: item.itemType === 'score' ? (isFail ? 2 : 9) : (isFail ? 0 : item.maxScore),
          notes: isFail ? (isCriticalFail ? 'KRİTİK: Acil düzeltme gerekli' : 'Eksiklik mevcut') : null,
          severity: isCriticalFail ? 'critical' : (isNormalFail ? 'minor' : null),
        },
      });
      if (isCriticalFail) criticalResponseIds.push(resp.id);
    }

    // Düzeltici faaliyetler (bazıları kanıtlı, bazıları bekliyor)
    if (criticalResponseIds.length > 0) {
      await prisma.correctiveAction.create({
        data: {
          inspectionId: insp2.id,
          responseId: criticalResponseIds[0],
          description: 'SKT geçmiş ürünler raftan kaldırıldı, imha edildi.',
          isCritical: true,
          createdById: manager.id,
          status: 'evidence_uploaded',
          evidencePhotoPath: '/uploads/1774869849525-x3ljv6ubk1h.jpg',
          evidenceNotes: 'Ürünler imha edildikten sonra fotoğraflandı',
          evidenceUploadedAt: daysAgo(5),
        },
      });
      if (criticalResponseIds.length > 1) {
        await prisma.correctiveAction.create({
          data: {
            inspectionId: insp2.id,
            responseId: criticalResponseIds[1],
            description: 'Tezgahlar dezenfekte edildi.',
            isCritical: true,
            createdById: manager.id,
            status: 'pending',
          },
        });
      }
    }

    // --- DENETİM 3: Şube 2 Mağaza - Tamamlanmış (reviewed), mükemmel puan ---
    const insp3 = await prisma.inspection.create({
      data: {
        branchId: branches[1].id,
        inspectorId: inspector.id,
        templateId: magazaTpl.id,
        status: 'reviewed',
        totalScore: 270,
        maxPossibleScore: 280,
        scorePercentage: 96.43,
        startedAt: daysAgo(30),
        completedAt: daysAgo(30),
        reviewedAt: daysAgo(30),
        locationVerified: true,
        latitude: 37.885,
        longitude: 32.48,
      },
    });
    for (const item of insp1Items) {
      await prisma.inspectionResponse.create({
        data: {
          inspectionId: insp3.id,
          checklistItemId: item.id,
          passed: item.itemType === 'boolean' ? true : null,
          score: item.itemType === 'score' ? 9 : item.maxScore,
        },
      });
    }

    // --- DENETİM 4: Kesimhane - completed (gönderildi, müdüre düşmüş) ---
    const kesimhaneItems = kesimhaneTpl.categories.flatMap(c => c.items);
    const insp4 = await prisma.inspection.create({
      data: {
        branchId: branches[2].id,
        inspectorId: inspector.id,
        templateId: kesimhaneTpl.id,
        status: 'completed',
        totalScore: 78,
        maxPossibleScore: 120,
        scorePercentage: 65.0,
        startedAt: daysAgo(3),
        completedAt: daysAgo(3),
        locationVerified: true,
        latitude: 37.91,
        longitude: 32.52,
      },
    });
    for (const item of kesimhaneItems) {
      const isFail = item.isCritical && Math.random() < 0.5;
      await prisma.inspectionResponse.create({
        data: {
          inspectionId: insp4.id,
          checklistItemId: item.id,
          passed: item.itemType === 'boolean' ? !isFail : null,
          score: item.itemType === 'score' ? (isFail ? 3 : 8) : (isFail ? 0 : item.maxScore),
          notes: isFail ? 'Hijyen standardı karşılanmıyor' : null,
          severity: isFail ? 'critical' : null,
        },
      });
    }

    // --- DENETİM 5: Merkez Mağaza - scheduled (gelecek hafta) ---
    await prisma.inspection.create({
      data: {
        branchId: branches[0].id,
        inspectorId: inspector.id,
        templateId: magazaTpl.id,
        status: 'scheduled',
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        locationVerified: false,
      },
    });

    // --- DENETİM 6: Yufka Üretim - in_progress (devam ediyor) ---
    if (isgTpl) {
      const isgItems = isgTpl.categories.flatMap(c => c.items);
      const insp6 = await prisma.inspection.create({
        data: {
          branchId: branches[4].id,
          inspectorId: inspector.id,
          templateId: isgTpl.id,
          status: 'in_progress',
          startedAt: daysAgo(1),
          locationVerified: true,
          latitude: 37.86,
          longitude: 32.51,
        },
      });
      // Yarısı yanıtlanmış
      for (let i = 0; i < Math.floor(isgItems.length / 2); i++) {
        const item = isgItems[i];
        await prisma.inspectionResponse.create({
          data: {
            inspectionId: insp6.id,
            checklistItemId: item.id,
            passed: item.itemType === 'boolean' ? true : null,
            score: item.itemType === 'score' ? 7 : item.maxScore,
          },
        });
      }
    }

    // --- TUTANAK ---
    await prisma.tutanak.create({
      data: {
        inspectionId: insp2.id,
        createdById: inspector.id,
        title: 'Mağaza Hijyen Tutanağı',
        content: { fields: [
          { label: 'Konu', value: 'Merkez Mağaza hijyen denetimi bulguları' },
          { label: 'Tespit Edilen Durum', value: 'Tezgah hijyeni yetersiz, SKT geçmiş ürün tespit edildi' },
          { label: 'Alınan Önlem', value: 'Ürünler imha edildi, tezgahlar dezenfekte edildi' },
          { label: 'Sonuç', value: 'Düzeltici faaliyetler başlatıldı, takip edilecek' },
        ]},
        status: 'sent',
        sentAt: daysAgo(6),
      },
    });

    // --- BİLDİRİMLER ---
    await prisma.notification.createMany({
      data: [
        { userId: manager.id, title: 'Yeni Denetim - Düzeltici Faaliyet Gerekli', body: 'Merkez Mağaza şubesinde 3 kritik eksik tespit edildi.', data: { inspectionId: insp2.id, type: 'corrective_action_required' } },
        { userId: manager.id, title: 'Denetim Tamamlandı', body: 'Kesimhane şubesinde denetim tamamlandı. Puan: %65', data: { inspectionId: insp4.id, type: 'inspection_completed' } },
        { userId: inspector.id, title: 'Düzeltici Faaliyet Kanıtı Yüklendi', body: 'Merkez Mağaza - SKT maddesi için kanıt yüklendi.', data: { inspectionId: insp2.id, type: 'evidence_uploaded' } },
        { userId: admin.id, title: 'Denetim Süreci Tamamlandı', body: 'Şube 2 Mağaza denetim süreci tamamlandı. Rapor gönderildi.', data: { inspectionId: insp3.id, type: 'flow_completed' } },
        { userId: admin.id, title: 'Kritik Bulgular Tespit Edildi', body: 'Merkez Mağaza şubesinde 3 kritik bulgu tespit edildi.', data: { inspectionId: insp2.id, type: 'critical_findings' } },
      ],
    });

    // --- AKTİVİTE LOGLARI ---
    await prisma.activityLog.createMany({
      data: [
        { userId: inspector.id, action: 'INSPECTION_COMPLETED', entityType: 'inspection', entityId: insp1.id, details: { branchName: 'Merkez Mağaza', scorePercentage: 88.57 }, createdAt: daysAgo(45) },
        { userId: inspector.id, action: 'INSPECTION_COMPLETED', entityType: 'inspection', entityId: insp3.id, details: { branchName: 'Şube 2 Mağaza', scorePercentage: 96.43 }, createdAt: daysAgo(30) },
        { userId: inspector.id, action: 'INSPECTION_COMPLETED', entityType: 'inspection', entityId: insp2.id, details: { branchName: 'Merkez Mağaza', scorePercentage: 66.07 }, createdAt: daysAgo(7) },
        { userId: manager.id, action: 'CORRECTIVE_ACTION_CREATED', entityType: 'corrective_action', entityId: insp2.id, details: { inspectionId: insp2.id, isCritical: true }, createdAt: daysAgo(6) },
        { userId: manager.id, action: 'EVIDENCE_UPLOADED', entityType: 'corrective_action', entityId: insp2.id, details: { inspectionId: insp2.id }, createdAt: daysAgo(5) },
        { userId: inspector.id, action: 'INSPECTION_COMPLETED', entityType: 'inspection', entityId: insp4.id, details: { branchName: 'Kesimhane', scorePercentage: 65.0 }, createdAt: daysAgo(3) },
        { userId: null, action: 'INSPECTION_FINALIZED', entityType: 'inspection', entityId: insp1.id, details: { branchName: 'Merkez Mağaza', pdfGenerated: true }, createdAt: daysAgo(43) },
        { userId: null, action: 'REPORT_EMAIL_SENT', entityType: 'inspection', entityId: insp3.id, details: { recipients: ['abdullah.dagci@ertansa.com.tr'] }, createdAt: daysAgo(30) },
      ],
    });

    // --- DENETİM PLANLARI ---
    await prisma.inspectionSchedule.createMany({
      data: [
        { branchId: branches[0].id, templateId: magazaTpl.id, inspectorId: inspector.id, frequencyDays: 30, nextDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), lastInspectionDate: daysAgo(23) },
        { branchId: branches[1].id, templateId: magazaTpl.id, inspectorId: inspector.id, frequencyDays: 30, nextDueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
        { branchId: branches[2].id, templateId: kesimhaneTpl.id, inspectorId: inspector.id, frequencyDays: 15, nextDueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), lastInspectionDate: daysAgo(12) },
      ],
    });

    console.log('Test denetimleri oluşturuldu (6 denetim, düzeltici faaliyetler, tutanak, bildirimler, loglar)');
  }

  console.log('---');
  console.log('Giriş bilgileri:');
  console.log('  Admin:    admin@ertansa.com / admin123');
  console.log('  Müdür:    mudur@ertansa.com / mudur123');
  console.log('  Denetçi:  denetci@ertansa.com / denetci123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
