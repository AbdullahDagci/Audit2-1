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

  // Sistem ayarları - varsayılan management email
  await prisma.systemSetting.upsert({
    where: { key: 'management_emails' },
    create: { key: 'management_emails', value: JSON.stringify(['abdullah.dagci@ertansa.com.tr']) },
    update: {},
  });
  console.log('Sistem ayarları oluşturuldu');

  console.log('---');
  console.log('Giriş bilgileri:');
  console.log('  Admin:    admin@ertansa.com / admin123');
  console.log('  Müdür:    mudur@ertansa.com / mudur123');
  console.log('  Denetçi:  denetci@ertansa.com / denetci123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
