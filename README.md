# ERTANSA Denetim Sistemi

ERTANSA gıda şirketinin farklı tesis türlerinde (mağaza, kesimhane, ahır, yufka fabrikası, depo) kalite denetimi yapmasını sağlayan full-stack denetim yönetim sistemi.

## Mimari

```
Audit2/
├── apps/
│   ├── backend/      Express.js API (Port 4000)
│   ├── web/          Next.js 14 Web Paneli (Port 3000)
│   └── mobile/       React Native / Expo Mobil Uygulama
├── packages/
│   └── shared/       Ortak tipler, enum'lar, scoring/validation
└── package.json      npm workspaces monorepo
```

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Backend | Node.js, Express.js 4.21, TypeScript 5.4, Prisma 6.0 |
| Veritabanı | PostgreSQL 16 |
| Web | Next.js 14, React 18, Tailwind CSS 3.4, Recharts |
| Mobil | React Native 0.81, Expo 54, Expo Router, Zustand |
| Auth | JWT + bcrypt |
| Dosya | Multer + Sharp |
| Email | Nodemailer (SMTP) |
| PDF | Puppeteer |

## Kurulum

### Gereksinimler
- Node.js 20 LTS
- PostgreSQL 16
- Android Studio (mobil geliştirme için)

### 1. Bağımlılıkları Kur

```bash
npm install --legacy-peer-deps
cd apps/backend && npm install --legacy-peer-deps
cd ../web && npm install --legacy-peer-deps
cd ../mobile && npm install --legacy-peer-deps
cd ../..
```

### 2. Veritabanı Kur

PostgreSQL'de veritabanı oluştur:

```sql
CREATE DATABASE ertansa_audit;
```

Backend `.env` dosyasını düzenle (`apps/backend/.env`):

```env
DATABASE_URL="postgresql://postgres:SIFREN@127.0.0.1:5432/ertansa_audit?schema=public"
JWT_SECRET="guclu-bir-secret-key"
PORT=4000
UPLOAD_DIR="./uploads"

# SMTP (opsiyonel - boş bırakılırsa test modu çalışır)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="ERTANSA Denetim <denetim@ertansa.com.tr>"
SMTP_TO_MANAGEMENT=
```

### 3. Migration ve Seed Data

```bash
cd apps/backend
npx prisma migrate deploy
npx prisma generate
npx tsx prisma/seed.ts
```

### 4. Çalıştır

```bash
# Backend (Port 4000)
npm run dev:backend

# Web (Port 3000)
npm run dev:web

# Mobil (Expo)
npm run dev:mobile
```

## Giriş Bilgileri (Seed Data)

| Rol | Email | Şifre |
|-----|-------|-------|
| Admin | admin@ertansa.com | admin123 |
| Şube Müdürü | mudur@ertansa.com | mudur123 |
| Denetçi | denetci@ertansa.com | denetci123 |

### Seed Data İçeriği
- 3 kullanıcı (admin, müdür, denetçi)
- 6 şube (Merkez Mağaza, Şube 2, Kesimhane, Ahır, Yufka Üretim, Ana Depo)
- 3 denetim şablonu (Mağaza Genel Denetim, Kesimhane Genel Denetim, İSG Denetimi)

## Kullanıcı Rolleri

| Rol | Yetkiler |
|-----|----------|
| **Admin** | Tüm yetkilere sahip. Kullanıcı, şube, şablon yönetimi. Tüm denetimleri görme. Aktivite logları. |
| **Müdür (Manager)** | Kendi şubelerine yapılan denetimleri görür. Düzeltici faaliyet ekler ve kanıt yükler. |
| **Denetçi (Inspector)** | Denetim başlatır/tamamlar. Fotoğraf yükler. Sadece kendi denetimlerini görür. |

## Denetim İş Akışı

```
1. Denetçi → Denetim planlar veya başlatır
2. Denetçi → Soruları yanıtlar, fotoğraf çeker, not ekler
3. Denetçi → "Gönder" butonuna basar
4. Sistem → Puanı otomatik hesaplar
       ├── Kritik eksik YOK → Otomatik "Tamamlandı" + üst yönetime mail
       └── Kritik eksik VAR → Şube müdürüne bildirim gider
5. Şube Müdürü → Eksik maddelere düzeltici faaliyet + kanıt (fotoğraf) yükler
6. Her kanıt yüklenmesinde → Denetçiye bildirim gider
7. Tüm kritik maddeler tamamlanınca → Otomatik "Tamamlandı" + üst yönetime PDF rapor mail gider
```

### Denetim Durumları

| Durum | Açıklama |
|-------|----------|
| `scheduled` | Planlandı (gelecek tarih için) |
| `draft` | Taslak |
| `in_progress` | Devam ediyor (denetçi dolduruyor) |
| `completed` | Gönderildi (denetçi tamamladı) |
| `pending_action` | İşlem bekliyor (müdür düzeltici faaliyet ekliyor) |
| `reviewed` | Tamamlandı (tüm süreç bitti, rapor gönderildi) |

## Düzeltici Faaliyet Akışı

- Denetçi denetimi gönderdiğinde kritik maddelerde eksik varsa şube müdürüne bildirim düşer
- Şube müdürü her kritik eksik maddeye **düzeltici faaliyet açıklaması** yazar
- Her düzeltici faaliyete **kanıt fotoğrafı** yüklemesi **zorunludur** (kritik maddeler için)
- Kritik olmayan eksiklere düzeltici faaliyet ekleme isteğe bağlıdır
- Kanıt yüklendiğinde denetçiye bildirim gider (bilgi amaçlı)
- Tüm kritik maddeler kanıtlandığında denetim otomatik tamamlanır ve üst yönetime mail gider

## Tutanak Sistemi

- Denetçi denetim sırasında veya sonrasında isteğe bağlı **tutanak** oluşturabilir
- Dinamik form: etiket-değer çiftleri (Konu, Tespit Edilen Durum, Alınan Önlem, Sonuç vb.)
- **Kaydet** (taslak) veya **Gönder** seçenekleri
- PDF export desteği

## Önceki Denetim Takibi

- Denetçi yeni denetim başlattığında, o şubenin **önceki denetimindeki kritik eksiklikler** otomatik gösterilir
- Denetçi "geçen sefer bu maddede eksik vardı, düzeltilmiş mi?" diye kontrol edebilir

## API Endpoint'leri

| Grup | Prefix | Açıklama |
|------|--------|----------|
| Auth | `/api/auth` | Login, register, current user |
| Kullanıcılar | `/api/users` | Kullanıcı listeleme, güncelleme |
| Şubeler | `/api/branches` | CRUD |
| Şablonlar | `/api/templates` | CRUD + kategori/soru yönetimi |
| Denetimler | `/api/inspections` | CRUD + yanıt, fotoğraf, tamamlama |
| Düzeltici Faaliyet | `/api/corrective-actions` | Faaliyet oluştur, kanıt yükle |
| Tutanak | `/api/tutanak` | CRUD + gönder |
| Takvim | `/api/schedules` | Denetim planlama |
| Bildirimler | `/api/notifications` | Liste, okundu işaretle |
| Raporlar | `/api/reports` | Dashboard, şube karşılaştırma |
| Aktivite Log | `/api/activity-logs` | Filtrelenebilir log (admin) |
| Tesis Türleri | `/api/facility-types` | CRUD |
| Health | `/api/health` | Sağlık kontrolü |

## Veritabanı Şeması

### Modeller (14 adet)

| Model | Açıklama |
|-------|----------|
| User | Kullanıcılar (admin/manager/inspector) |
| Branch | Şubeler (konum, geofence) |
| ChecklistTemplate | Denetim şablonları |
| ChecklistCategory | Şablon kategorileri (ağırlıklı) |
| ChecklistItem | Denetim soruları (boolean/score/text/photo) |
| Inspection | Denetim kayıtları |
| InspectionResponse | Madde yanıtları |
| InspectionPhoto | Denetim fotoğrafları (GPS) |
| CorrectiveAction | Düzeltici faaliyetler + kanıt |
| Tutanak | Denetim tutanakları |
| ActivityLog | Aktivite logları |
| InspectionSchedule | Periyodik denetim planları |
| Notification | Bildirimler |
| PushToken | Mobil push token'ları |

### Tesis Türleri

| Anahtar | Açıklama |
|---------|----------|
| magaza | Mağaza |
| kesimhane | Kesimhane |
| ahir | Ahır |
| yufka | Yufka Üretim |
| depo | Depo |

## Puanlama Sistemi

- Her kategori **ağırlıklı** puanlanır (weight)
- Genel skor = kategorilerin ağırlıklı ortalaması
- Renk kodları: **Yeşil** (>=%75), **Turuncu** (%50-74), **Kırmızı** (<%50)
- Etiketler: Mükemmel (%90+), İyi (%75-89), Orta (%50-74), Zayıf (%25-49), Kritik (<%25)
- **Kritik maddeler** ayrıca işaretlenir ve başarısızlıkta bildirim tetiklenir

## Email Rapor Sistemi

- SMTP üzerinden kurumsal email gönderimi
- Denetim tamamlandığında otomatik PDF rapor oluşturulur (Puppeteer)
- 7 bölümlü kurumsal PDF: Kapak, Genel Bilgiler, Puan Özeti, Kritik Bulgular, Detaylı Sonuçlar, Düzeltici Faaliyetler, İmza Alanı
- Üst yönetime otomatik mail + PDF ek olarak gönderilir
- SMTP bilgileri boş bırakılırsa test modu (Ethereal Email) çalışır

## Web Paneli Sayfaları

| Sayfa | Yol | Açıklama |
|-------|-----|----------|
| Giriş | `/login` | Email/şifre ile giriş |
| Dashboard | `/dashboard` | İstatistikler, grafikler |
| Şube Paneli | `/dashboard/manager` | Müdür için bekleyen denetimler |
| Denetimler | `/dashboard/inspections` | Denetim listesi + filtreleme |
| Denetim Detay | `/dashboard/inspections/[id]` | Detay, düzeltici faaliyet UI |
| Şubeler | `/dashboard/branches` | Şube yönetimi |
| Raporlar | `/dashboard/reports` | Grafik ve analizler |
| Kullanıcılar | `/dashboard/users` | Kullanıcı yönetimi |
| Şablonlar | `/dashboard/templates` | Denetim şablonu yönetimi |
| Takvim | `/dashboard/schedules` | Denetim planları |
| Aktivite Kayıtları | `/dashboard/activity-logs` | Admin log görüntüleme |
| Bildirimler | `/dashboard/notifications` | Bildirim listesi |
| Ayarlar | `/dashboard/settings` | Sistem ayarları |

## Mobil Uygulama Ekranları

| Ekran | Açıklama |
|-------|----------|
| Login | Giriş |
| Home (Tab) | Dashboard, istatistikler |
| Denetimler (Tab) | Denetim listesi |
| Takvim (Tab) | Takvim görünümü |
| Admin (Tab) | Yönetim paneli (admin/müdür) |
| Profil (Tab) | Profil ve ayarlar |
| Yeni Denetim | Tesis seç → şube seç → başla |
| Denetim Formu | Sorular, fotoğraf, notlar |
| İnceleme | Denetim detay, düzeltici faaliyet |
| Düzeltici Faaliyetler | Eksik maddeler, kanıt yükleme |
| Tutanak | Tutanak oluşturma formu |

## Aktivite Log Sistemi

Admin panelinde tüm önemli işlemler loglanır:

| Log Tipi | Açıklama |
|----------|----------|
| INSPECTION_COMPLETED | Denetim tamamlandı |
| INSPECTION_FINALIZED | Denetim süreci bitti |
| CORRECTIVE_ACTION_CREATED | Düzeltici faaliyet eklendi |
| EVIDENCE_UPLOADED | Kanıt yüklendi |
| REPORT_EMAIL_SENT | Rapor maili gönderildi |
| TUTANAK_CREATED | Tutanak oluşturuldu |
| TUTANAK_SENT | Tutanak gönderildi |

## Production Deploy

Detaylı deploy rehberi için `DEPLOY.md` dosyasına bakın.

**Sunucu:** 51.38.209.143 (Windows)
**Domain:** denetim.ertansa.com.tr

```bash
# Backend build & başlat
cd apps/backend
npm run build
pm2 start dist/index.js --name "ertansa-api"

# Web build & başlat
cd apps/web
npm run build
pm2 start npm --name "ertansa-web" -- start -- -p 3001

# Mobil APK
cd apps/mobile
eas build -p android --profile preview
```

## Proje Komutları

```bash
# Geliştirme
npm run dev:backend       # Backend (port 4000)
npm run dev:web           # Web (port 3000)
npm run dev:mobile        # Mobil (Expo)

# Veritabanı
npm run db:migrate        # Migration çalıştır
npm run db:seed           # Seed data yükle
npm run db:studio         # Prisma Studio aç

# Build
npm run build:web         # Web build
npm run build:shared      # Shared package build
```

## Lisans

Bu proje özel bir projedir. Tüm hakları saklıdır.
