import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed başlatiyor...');

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
      fullName: 'Ahmet Yilmaz',
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

  // Subeler
  const branches = await Promise.all([
    prisma.branch.create({ data: { name: 'Merkez Mağaza', facilityType: 'magaza', address: 'Konya Merkez', city: 'Konya', latitude: 37.8746, longitude: 32.4932, managerId: manager.id } }),
    prisma.branch.create({ data: { name: 'Şube 2 Mağaza', facilityType: 'magaza', address: 'Selcuklu', city: 'Konya', latitude: 37.8850, longitude: 32.4800, managerId: manager.id } }),
    prisma.branch.create({ data: { name: 'Kesimhane', facilityType: 'kesimhane', address: 'Organize Sanayi', city: 'Konya', latitude: 37.9100, longitude: 32.5200 } }),
    prisma.branch.create({ data: { name: 'Ahir - Merkez', facilityType: 'ahir', address: 'Cihanbeyli Yolu', city: 'Konya', latitude: 37.8500, longitude: 32.4500 } }),
    prisma.branch.create({ data: { name: 'Yufka Üretim', facilityType: 'yufka', address: 'Karatay', city: 'Konya', latitude: 37.8600, longitude: 32.5100 } }),
    prisma.branch.create({ data: { name: 'Ana Depo', facilityType: 'depo', address: 'Organize Sanayi', city: 'Konya', latitude: 37.9050, longitude: 32.5150 } }),
  ]);

  console.log('Subeler oluşturuldu');

  // MAGAZA SABLONU
  const magazaTemplate = await prisma.checklistTemplate.create({
    data: {
      facilityType: 'magaza',
      name: 'Mağaza Genel Denetim',
      totalMaxScore: 300,
      categories: {
        create: [
          {
            name: 'Raf Duzeni', sortOrder: 1, weight: 1.0,
            items: { create: [
              { questionText: 'Raf etiketleri guncel mi?', maxScore: 10, sortOrder: 1 },
              { questionText: 'Urunler duzenli yerlestirilmis mi?', maxScore: 10, photoRequired: true, sortOrder: 2 },
              { questionText: 'Eksik urun var mi?', maxScore: 10, photoRequired: true, sortOrder: 3 },
              { questionText: 'Raf temizligi yapilmis mi?', maxScore: 10, sortOrder: 4 },
              { questionText: 'Urun gruplandirmasi dogru mu?', maxScore: 10, sortOrder: 5 },
            ]},
          },
          {
            name: 'Son Kullanma Tarihi', sortOrder: 2, weight: 1.5,
            items: { create: [
              { questionText: 'SKT gecmis urun var mi?', maxScore: 10, isCritical: true, photoRequired: true, sortOrder: 1 },
              { questionText: 'SKT si yaklasan urunler ayrilmis mi?', maxScore: 10, sortOrder: 2 },
              { questionText: 'SKT kontrol kaydi tutulmus mu?', maxScore: 10, sortOrder: 3 },
              { questionText: 'Tezgah urunlerinin SKT kontrol edilmis mi?', maxScore: 10, sortOrder: 4 },
            ]},
          },
          {
            name: 'Temizlik ve Hijyen', sortOrder: 3, weight: 1.5,
            items: { create: [
              { questionText: 'Zemin temiz mi?', maxScore: 10, photoRequired: true, sortOrder: 1 },
              { questionText: 'Tezgahlar temiz mi?', maxScore: 10, isCritical: true, photoRequired: true, sortOrder: 2 },
              { questionText: 'Cop kutulari bosaltilmis mi?', maxScore: 10, sortOrder: 3 },
              { questionText: 'Sogutucu dolaplar temiz mi?', maxScore: 10, isCritical: true, photoRequired: true, sortOrder: 4 },
              { questionText: 'Tuvalet ve lavabo temiz mi?', maxScore: 10, photoRequired: true, sortOrder: 5 },
              { questionText: 'Genel koku problemi var mi?', maxScore: 10, sortOrder: 6 },
            ]},
          },
          {
            name: 'Fiyat Etiketi', sortOrder: 4, weight: 1.0,
            items: { create: [
              { questionText: 'Tum urunlerde fiyat etiketi var mi?', maxScore: 10, sortOrder: 1 },
              { questionText: 'Etiket fiyatlari kasa fiyatiyla uyumlu mu?', maxScore: 10, sortOrder: 2 },
              { questionText: 'Kampanya etiketleri guncel mi?', maxScore: 10, sortOrder: 3 },
              { questionText: 'Etiketler okunakli mi?', maxScore: 10, sortOrder: 4 },
            ]},
          },
          {
            name: 'Kasa Sureci', sortOrder: 5, weight: 0.8,
            items: { create: [
              { questionText: 'Kasa alani duzenli mi?', maxScore: 10, sortOrder: 1 },
              { questionText: 'Poset/canta stoku yeterli mi?', maxScore: 10, sortOrder: 2 },
              { questionText: 'Para ustu hazir mi?', maxScore: 10, sortOrder: 3 },
              { questionText: 'Musteri bekleme suresi uygun mu?', itemType: 'score', maxScore: 10, sortOrder: 4 },
            ]},
          },
          {
            name: 'Personel', sortOrder: 6, weight: 1.2,
            items: { create: [
              { questionText: 'Personel kiyafetleri uygun mu?', maxScore: 10, photoRequired: true, sortOrder: 1 },
              { questionText: 'Isimlik takili mi?', maxScore: 10, sortOrder: 2 },
              { questionText: 'Personel sayisi yeterli mi?', maxScore: 10, sortOrder: 3 },
              { questionText: 'Personel hijyen kurallarina uyuyor mu?', maxScore: 10, sortOrder: 4 },
              { questionText: 'Musteriye karsi tutum uygun mu?', itemType: 'score', maxScore: 10, sortOrder: 5 },
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
          { questionText: 'Ekipmanlar sterilize edilmis mi?', maxScore: 10, isCritical: true, photoRequired: true, sortOrder: 2 },
          { questionText: 'Calisma tezgahlari temiz mi?', maxScore: 10, isCritical: true, sortOrder: 3 },
          { questionText: 'Lavabo ve el dezenfektani mevcut mu?', maxScore: 10, sortOrder: 4 },
          { questionText: 'Atik alani hijyenik mi?', maxScore: 10, photoRequired: true, sortOrder: 5 },
        ]}},
        { name: 'Soguk Zincir', sortOrder: 2, weight: 2.0, items: { create: [
          { questionText: 'Soguk hava deposu sicakligi uygun mu?', maxScore: 10, isCritical: true, photoRequired: true, sortOrder: 1 },
          { questionText: 'Sicaklik kayitlari tutuluyor mu?', maxScore: 10, isCritical: true, sortOrder: 2 },
          { questionText: 'Et urunleri dogru sicaklikta muhafaza ediliyor mu?', maxScore: 10, photoRequired: true, sortOrder: 3 },
        ]}},
        { name: 'Koruyucu Ekipman', sortOrder: 3, weight: 1.5, items: { create: [
          { questionText: 'Eldiven kullaniliyor mu?', maxScore: 10, photoRequired: true, sortOrder: 1 },
          { questionText: 'Bone/kep takili mi?', maxScore: 10, photoRequired: true, sortOrder: 2 },
          { questionText: 'Onluk giyilmis mi?', maxScore: 10, sortOrder: 3 },
          { questionText: 'Cizme/galos kullaniliyor mu?', maxScore: 10, sortOrder: 4 },
        ]}},
      ]},
    },
  });

  // ISG SABLONU
  await prisma.checklistTemplate.create({
    data: {
      facilityType: 'magaza', name: 'İş Sağlığı ve Güvenliği (ISG)', totalMaxScore: 300,
      categories: { create: [
        { name: 'Yangin Guvenligi', sortOrder: 1, weight: 2.0, items: { create: [
          { questionText: 'Yangin tupleri kontrol edilmis mi?', maxScore: 10, isCritical: true, photoRequired: true, sortOrder: 1 },
          { questionText: 'Tup son kontrol tarihi uygun mu?', maxScore: 10, isCritical: true, photoRequired: true, sortOrder: 2 },
          { questionText: 'Yangin alarm sistemi calisiyor mu?', maxScore: 10, sortOrder: 3 },
          { questionText: 'Yangin tatbikati yapilmis mi?', maxScore: 10, sortOrder: 4 },
        ]}},
        { name: 'Acil Cikislar', sortOrder: 2, weight: 2.0, items: { create: [
          { questionText: 'Acil cikis yollari acik mi?', maxScore: 10, isCritical: true, photoRequired: true, sortOrder: 1 },
          { questionText: 'Acil cikis isaretleri aydinlatilmis mi?', maxScore: 10, isCritical: true, photoRequired: true, sortOrder: 2 },
          { questionText: 'Acil cikis kapilari kilitli degil mi?', maxScore: 10, photoRequired: true, sortOrder: 3 },
          { questionText: 'Tahliye plani asili mi?', maxScore: 10, photoRequired: true, sortOrder: 4 },
        ]}},
        { name: 'Elektrik Guvenligi', sortOrder: 3, weight: 1.5, items: { create: [
          { questionText: 'Elektrik panosu kapali ve kilitli mi?', maxScore: 10, isCritical: true, photoRequired: true, sortOrder: 1 },
          { questionText: 'Acikta kablo var mi?', maxScore: 10, photoRequired: true, sortOrder: 2 },
          { questionText: 'Topraklama kontrol edilmis mi?', maxScore: 10, sortOrder: 3 },
        ]}},
        { name: 'Kisisel Koruyucu Ekipman', sortOrder: 4, weight: 1.5, items: { create: [
          { questionText: 'Personel uygun KKE kullaniyor mu?', maxScore: 10, photoRequired: true, sortOrder: 1 },
          { questionText: 'KKE stoku yeterli mi?', maxScore: 10, sortOrder: 2 },
          { questionText: 'KKE egitimi verilmis mi?', maxScore: 10, sortOrder: 3 },
        ]}},
        { name: 'Genel ISG', sortOrder: 5, weight: 1.0, items: { create: [
          { questionText: 'Ilk yardim cantasi mevcut ve dolu mu?', maxScore: 10, photoRequired: true, sortOrder: 1 },
          { questionText: 'İSG panosu güncel mi?', maxScore: 10, photoRequired: true, sortOrder: 2 },
          { questionText: 'Risk değerlendirmesi yapılmış mı?', maxScore: 10, sortOrder: 3 },
          { questionText: 'İş kazası kayıtları tutulmuş mu?', maxScore: 10, sortOrder: 4 },
        ]}},
      ]},
    },
  });

  console.log('Şablonlar oluşturuldu');
  console.log('---');
  console.log('Giriş bilgileri:');
  console.log('  Admin:    admin@ertansa.com / admin123');
  console.log('  Müdür:    mudur@ertansa.com / mudur123');
  console.log('  Denetçi:  denetci@ertansa.com / denetci123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
