# ERTANSA Denetim Sistemi - Proje Rehberi

## Genel Bakis

ERTANSA gida sirketinin farkli tesis turlerinde (magaza, kesimhane, ahir, yufka fabrikasi, depo) kalite denetimi yapmasini saglayan full-stack denetim yonetim sistemi. Monorepo yapisinda, npm workspaces kullanir.

## Mimari

```
Audit2/
├── apps/
│   ├── backend/      Express.js API (Port 4000)
│   ├── web/          Next.js 14 Web Paneli (Port 3000)
│   └── mobile/       React Native / Expo 54 Mobil Uygulama
├── packages/
│   └── shared/       @ertansa/shared - Ortak tipler, enum'lar, scoring/validation
├── package.json      npm workspaces monorepo root
└── CLAUDE.md         Bu dosya
```

## Teknoloji Yigini

| Katman | Teknoloji | Versiyon |
|--------|-----------|----------|
| Backend | Node.js + Express.js + TypeScript | Express 4.21, TS 5.4 |
| ORM | Prisma | 6.0 |
| Veritabani | PostgreSQL | 16 |
| Web | Next.js + React + Tailwind CSS | Next 14.2, React 18, TW 3.4 |
| Mobil | React Native + Expo + Expo Router | RN 0.81, Expo 54 |
| State (Mobil) | Zustand | 5.0 |
| Auth | JWT (jsonwebtoken) + bcryptjs | 7 gun expiry |
| Dosya Upload | Multer + Sharp | 10MB limit, JPEG/PNG/WebP |
| Email | Nodemailer (SMTP / Ethereal test) | |
| PDF | Puppeteer (headless Chrome) | |
| Grafikler (Web) | Recharts | 2.12 |
| Grafikler (Mobil) | react-native-chart-kit | 6.12 |
| Offline (Mobil) | expo-sqlite | |
| Push Bildirim | expo-notifications | |

## Veritabani Semasi

**PostgreSQL Baglanti:** `postgresql://postgres:143623@127.0.0.1:5432/ertansa_audit?schema=public`

### Enum'lar
- `UserRole`: admin, manager, inspector
- `FacilityType`: magaza, kesimhane, ahir, yufka, depo
- `InspectionStatus`: scheduled, draft, in_progress, completed, pending_action, reviewed
- `SeverityLevel`: critical, major, minor, observation
- `ChecklistItemType`: boolean, score, text, photo_required
- `CorrectiveActionStatus`: pending, evidence_uploaded, completed
- `TutanakStatus`: draft, sent

### Modeller (14 adet)
| Model | Tablo | Aciklama |
|-------|-------|----------|
| User | users | Kullanicilar (admin/manager/inspector) |
| Branch | branches | Subeler (konum, geofence, facilityType) |
| ChecklistTemplate | checklist_templates | Denetim sablonlari |
| ChecklistCategory | checklist_categories | Sablon kategorileri (agirlikli weight) |
| ChecklistItem | checklist_items | Denetim sorulari (boolean/score/text/photo) |
| Inspection | inspections | Denetim kayitlari |
| InspectionResponse | inspection_responses | Madde yanitlari |
| InspectionPhoto | inspection_photos | Denetim fotograflari (GPS) |
| CorrectiveAction | corrective_actions | Duzeltici faaliyetler + kanit |
| Tutanak | tutanaks | Denetim tutanaklari |
| ActivityLog | activity_logs | Aktivite loglari |
| InspectionSchedule | inspection_schedules | Periyodik denetim planlari |
| Notification | notifications | Bildirimler |
| PushToken | push_tokens | Mobil push token'lari |

## Kullanici Rolleri ve Yetkileri

| Rol | Yetkiler |
|-----|----------|
| **admin** | Tum yetkilere sahip. Kullanici, sube, sablon yonetimi. Tum denetimleri gorur. Aktivite loglari. |
| **manager** | Kendi subelerine yapilan denetimleri gorur. Duzeltici faaliyet + kanit yukler. |
| **inspector** | Denetim baslatir/tamamlar. Fotograf yukler. Sadece kendi denetimlerini gorur. |

## API Endpoint'leri

| Grup | Prefix | Aciklama |
|------|--------|----------|
| Auth | `/api/auth` | login, register, me |
| Users | `/api/users` | Liste, guncelle |
| Branches | `/api/branches` | CRUD |
| Templates | `/api/templates` | CRUD + kategori/soru yonetimi |
| Inspections | `/api/inspections` | CRUD + yanit, foto, tamamlama, previous-findings |
| Corrective Actions | `/api/corrective-actions` | Faaliyet olustur, kanit yukle, deficiencies |
| Tutanak | `/api/tutanak` | CRUD + gonder |
| Schedules | `/api/schedules` | Denetim planlama |
| Notifications | `/api/notifications` | Liste, okundu, push-token |
| Reports | `/api/reports` | Dashboard, branch-comparison |
| Activity Logs | `/api/activity-logs` | Liste, stats (admin) |
| Facility Types | `/api/facility-types` | CRUD |
| Health | `/api/health` | Saglik kontrolu |

## Denetim Is Akisi

```
1. Denetci -> Denetim planlar veya baslatir
2. Denetci -> Sorulari yanitlar, fotograf ceker, not ekler
3. Denetci -> "Gonder" butonuna basar
4. Sistem -> Puani otomatik hesaplar
   ├── Kritik eksik YOK -> Otomatik "reviewed" + ust yonetime mail
   └── Kritik eksik VAR -> "pending_action" + Sube mudurune bildirim
5. Sube Muduru -> Eksik maddelere duzeltici faaliyet + kanit yukler
6. Her kanit yuklendiginde -> Denetciye bildirim gider
7. Tum kritik maddeler tamamlaninca -> Otomatik "reviewed" + PDF rapor mail
```

### Denetim Durumlari
| Durum | Aciklama |
|-------|----------|
| `scheduled` | Planlandi (gelecek tarih) |
| `draft` | Taslak |
| `in_progress` | Devam ediyor |
| `completed` | Gonderildi (denetci tamamladi) |
| `pending_action` | Islem bekliyor (mudur duzeltici faaliyet ekliyor) |
| `reviewed` | Tamamlandi (tum surec bitti, rapor gonderildi) |

## Puanlama Sistemi

- Her kategori **agirlikli** puanlanir (weight)
- Genel skor = kategorilerin agirlikli ortalamasi
- Renk kodlari: **Yesil** (>=%75), **Turuncu** (%50-74), **Kirmizi** (<%50)
- Etiketler: Mukemmel (%90+), Iyi (%75-89), Orta (%50-74), Zayif (%25-49), Kritik (<%25)
- Boolean maddeler: gecti = tam puan, kaldi = 0 puan
- Score maddeler: 0 ile max_score arasi
- Kritik maddeler basarisiz olursa bildirim tetiklenir

## Backend Dosya Yapisi

```
apps/backend/
├── .env                          # DB URL, JWT secret, SMTP, port
├── .env.production               # Production env
├── prisma/
│   ├── schema.prisma             # Veritabani semasi (14 model, 7 enum)
│   └── seed.ts                   # Test verileri (3 user, 6 branch, 3 template)
├── src/
│   ├── index.ts                  # Express app, CORS, routes, health check
│   ├── middleware/
│   │   ├── auth.ts               # JWT auth + role-based access (authenticate, requireRole)
│   │   └── upload.ts             # Multer disk storage, 10MB, JPEG/PNG/WebP
│   ├── routes/
│   │   ├── auth.ts               # Login, register, me
│   │   ├── users.ts              # User CRUD
│   │   ├── branches.ts           # Branch CRUD
│   │   ├── templates.ts          # Template + category + item CRUD
│   │   ├── inspections.ts        # Inspection CRUD, responses, photos, complete
│   │   ├── corrective-actions.ts # CA CRUD, evidence upload, deficiencies
│   │   ├── tutanak.ts            # Tutanak CRUD + send
│   │   ├── schedules.ts          # Schedule CRUD
│   │   ├── reports.ts            # Dashboard stats, branch comparison
│   │   ├── notifications.ts      # Notifications, push token
│   │   ├── facility-types.ts     # Facility type CRUD
│   │   └── activity-logs.ts      # Activity log list + stats
│   ├── services/
│   │   ├── email.ts              # Nodemailer (SMTP prod / Ethereal dev)
│   │   ├── pdf-generator.ts      # Puppeteer HTML->PDF (A4, 7 bolum)
│   │   ├── inspection-flow.ts    # Tamamlama akisi, finalize, bildirim
│   │   └── activity-logger.ts    # logActivity() helper
│   ├── utils/
│   │   └── query.ts              # qs() - query string safe parser
│   └── assets/
│       └── logo-base64.ts        # ERTANSA logo (base64)
└── tsconfig.json                 # ES2020, commonjs, outDir: ./dist
```

## Web Frontend Dosya Yapisi

```
apps/web/
├── .env.local                    # NEXT_PUBLIC_API_URL=http://localhost:4000
├── .env.production               # Production API URL
├── next.config.mjs               # Basit config
├── tailwind.config.ts            # Custom green primary palette
├── src/
│   ├── app/
│   │   ├── layout.tsx            # Root layout (Inter font, TR locale)
│   │   ├── page.tsx              # / -> /dashboard redirect
│   │   ├── globals.css           # Tailwind imports
│   │   ├── (auth)/login/page.tsx # Login sayfasi
│   │   └── (dashboard)/
│   │       ├── layout.tsx        # Sidebar + header layout
│   │       └── dashboard/
│   │           ├── page.tsx              # Ana dashboard
│   │           ├── inspections/page.tsx  # Denetim listesi
│   │           ├── inspections/[id]/page.tsx  # Denetim detay (1207 satir)
│   │           ├── branches/page.tsx     # Sube yonetimi
│   │           ├── templates/page.tsx    # Sablon listesi
│   │           ├── templates/[id]/page.tsx # Sablon duzenleyici
│   │           ├── users/page.tsx        # Kullanici yonetimi
│   │           ├── schedules/page.tsx    # Takvim
│   │           ├── reports/page.tsx      # Raporlar
│   │           ├── manager/page.tsx      # Mudur paneli
│   │           ├── activity-logs/page.tsx # Aktivite loglari
│   │           ├── notifications/page.tsx # Bildirimler
│   │           └── settings/page.tsx     # Ayarlar
│   ├── components/
│   │   ├── ui/                   # Sidebar, StatCard, Badge, Modal, DataTable
│   │   ├── dashboard/            # BranchPerformance, RecentInspections, CriticalAlerts, TrendChart
│   │   ├── inspections/          # PhotoGallery, ScoreBreakdown
│   │   └── reports/              # BranchComparison, TrendAnalysis
│   ├── lib/
│   │   ├── api.ts                # Tum API endpoint'leri icin fetch wrapper
│   │   └── utils.ts              # cn(), formatDate, getScoreColor, getStatusBadgeClass
│   ├── types/index.ts            # TypeScript arayuzleri
│   └── middleware.ts             # Auth cookie kontrolu (auth-session)
└── tsconfig.json                 # Path alias: @/* -> ./src/*
```

## Mobil Uygulama Dosya Yapisi

```
apps/mobile/
├── .env                          # EXPO_PUBLIC_API_URL=http://10.0.2.2:4000
├── .env.production               # Production API URL
├── app.json                      # Expo config (com.ertansa.audit)
├── eas.json                      # EAS build profilleri (dev/preview/production)
├── app/
│   ├── _layout.tsx               # Root layout + AuthGuard
│   ├── (auth)/
│   │   ├── _layout.tsx           # Auth stack layout
│   │   └── login.tsx             # Login ekrani
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Tab navigation (5 tab)
│   │   ├── index.tsx             # Home - dashboard + istatistikler
│   │   ├── inspections.tsx       # Denetim listesi + filtreler
│   │   ├── schedule.tsx          # Takvim gorunumu
│   │   ├── reports.tsx           # Raporlar (gizli tab)
│   │   ├── admin.tsx             # Admin paneli (users/templates/branches/schedules/types)
│   │   └── profile.tsx           # Profil + ayarlar
│   ├── inspection/
│   │   ├── new.tsx               # Yeni denetim (tesis sec -> sube sec -> basla)
│   │   ├── [id].tsx              # Denetim formu (checklist)
│   │   ├── review.tsx            # Denetim inceleme
│   │   ├── summary.tsx           # PDF ozet
│   │   ├── corrective-actions.tsx # Duzeltici faaliyetler
│   │   └── tutanak.tsx           # Tutanak formu
│   ├── template/[id].tsx         # Sablon duzenleme (admin)
│   ├── notifications.tsx         # Bildirim merkezi
│   └── settings.tsx              # Uygulama ayarlari
├── components/
│   ├── ui/                       # Button, Card, Badge, Loading
│   └── inspection/               # CategorySection, ChecklistItem, ScoreIndicator
├── stores/
│   ├── auth-store.ts             # Zustand: user, token, signIn/signOut
│   └── inspection-store.ts       # Zustand: responses Map, photos Map, location
├── lib/
│   ├── api.ts                    # Tum API endpoint'leri + token yonetimi (SecureStore)
│   ├── scoring.ts                # calculateCategoryScore, calculateOverallScore
│   ├── offline-db.ts             # SQLite lokal cache (pending inspections, templates, branches)
│   └── sync-queue.ts             # Offline veri senkronizasyonu
├── hooks/
│   ├── useCamera.ts              # Kamera + galeri (expo-image-picker)
│   ├── useLocation.ts            # GPS + geofence (Haversine formula, 200m radius)
│   └── useNotifications.ts       # Push notification token kaydi
├── constants/
│   ├── colors.ts                 # Tema renkleri (primary: #2E7D32)
│   └── config.ts                 # GEOFENCE_RADIUS, PHOTO_QUALITY, API_URL
└── tsconfig.json                 # extends expo/tsconfig.base
```

## Shared Package (@ertansa/shared)

```
packages/shared/
├── src/
│   ├── index.ts                  # Tum export'lar
│   ├── types/
│   │   ├── database.ts           # 13 model + 3 composed type arayuzu
│   │   └── enums.ts              # 7 enum + Turkce etiketler
│   └── utils/
│       ├── scoring.ts            # Agirlikli puanlama, renk, etiket
│       └── validation.ts         # Haversine, geofence, email/telefon, tarih formatlama
├── package.json                  # @ertansa/shared
└── tsconfig.json                 # ES2020, ESNext module
```

## Seed Data (Test Verileri)

### Kullanicilar
| Rol | Email | Sifre |
|-----|-------|-------|
| Admin | admin@ertansa.com | admin123 |
| Mudur | mudur@ertansa.com | mudur123 |
| Denetci | denetci@ertansa.com | denetci123 |

### Subeler (6 adet)
- Merkez Magaza (Konya Merkez) - magaza
- Sube 2 Magaza (Selcuklu) - magaza
- Kesimhane (Organize Sanayi) - kesimhane
- Ahir - Merkez (Cihanbeyli Yolu) - ahir
- Yufka Uretim (Karatay) - yufka
- Ana Depo (Organize Sanayi) - depo

### Sablonlar (3 adet)
1. **Magaza Genel Denetim** - 6 kategori, 300 puan
2. **Kesimhane Genel Denetim** - 3 kategori, 250 puan (Hijyen 2.0x, Soguk Zincir 2.0x)
3. **Is Sagligi ve Guvenligi (ISG)** - 5 kategori, 300 puan

## Onemli Portlar

| Servis | Port | Aciklama |
|--------|------|----------|
| Backend API | 4000 | Express.js |
| Web Panel | 3000 | Next.js dev |
| Web Panel (prod) | 3001 | Next.js start |
| Prisma Studio | 5555 | DB yonetim araci |
| Expo Dev Server | 8081 | Metro bundler |
| PostgreSQL | 5432 | Veritabani |

## Ortam Degiskenleri

### Backend (.env)
```
DATABASE_URL="postgresql://postgres:143623@127.0.0.1:5432/ertansa_audit?schema=public"
JWT_SECRET="ertansa-audit-jwt-secret-key-degistirin"
PORT=4000
UPLOAD_DIR="./uploads"
SMTP_HOST=         # Bos = Ethereal test modu
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="ERTANSA Denetim <denetim@ertansa.com.tr>"
SMTP_TO_MANAGEMENT=
```

### Web (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Mobile (.env)
```
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000
```
> Not: `10.0.2.2` Android emulatorun host makinesine eristigi ozel IP adresidir.

## Gelistirme Komutlari

```bash
# Root'tan calistirma
npm run dev:backend       # Backend (port 4000)
npm run dev:web           # Web (port 3000)
npm run dev:mobile        # Mobil (Expo)

# Veritabani
npm run db:migrate        # Prisma migration
npm run db:seed           # Seed data yukle
npm run db:studio         # Prisma Studio (port 5555)

# Build
npm run build:web         # Web build
npm run build:shared      # Shared package build

# Backend icinden
cd apps/backend
npx prisma migrate dev    # Yeni migration olustur
npx prisma db push        # Semayi direkt push et
npx prisma generate       # Client regenerate
npx tsx prisma/seed.ts    # Seed calistir
```

## Onemli Kurallar ve Konvansiyonlar

1. **npm install** her zaman `--legacy-peer-deps` flag'i ile yapilmali (peer dependency uyumsuzluklari)
2. **Prisma schema** degistikten sonra `npx prisma generate` calistirilmali
3. **uploads/** klasoru backend root'unda olmali (gitignore'da degil, bos olusturulmali)
4. **JWT token** 7 gun gecerli, Bearer token olarak gonderilir
5. **CORS** development'ta `*`, production'da `CORS_ORIGIN` env var
6. **JSON body limit** 50MB (buyuk foto base64 icin)
7. **Dosya upload** max 10MB, sadece JPEG/PNG/WebP
8. **Geofence** default 200m radius, Haversine formula
9. **TypeScript strict** sadece web ve shared'da aktif, backend'de `strict: false`
10. **Mobile API URL** emultor icin `10.0.2.2:4000`, fiziksel cihaz icin yerel IP

## Production Deploy

- **Sunucu:** 51.38.209.143 (Windows)
- **Domain:** denetim.ertansa.com.tr
- **Process Manager:** PM2
- **Reverse Proxy:** IIS veya Nginx
- **SSL:** Win-ACME (Let's Encrypt)
- **APK:** EAS Build (Expo Application Services)

Detayli deploy rehberi icin `DEPLOY.md` dosyasina bakin.

## Email Sistemi

- SMTP ayarlari bos ise **Ethereal Email** test modu calisir
- Denetim tamamlandiginda Puppeteer ile 7 bolumlu kurumsal PDF olusturulur
- PDF: Kapak, Genel Bilgiler, Puan Ozeti, Kritik Bulgular, Detayli Sonuclar, Duzeltici Faaliyetler, Imza Alani
- Rapor numarasi: DNT-YYYYMM-XXXX formati
- Ust yonetime otomatik mail + PDF ek olarak gonderilir

## Aktivite Log Tipleri

| Log Tipi | Aciklama |
|----------|----------|
| INSPECTION_COMPLETED | Denetim tamamlandi |
| INSPECTION_FINALIZED | Denetim sureci bitti |
| CORRECTIVE_ACTION_CREATED | Duzeltici faaliyet eklendi |
| EVIDENCE_UPLOADED | Kanit yuklendi |
| REPORT_EMAIL_SENT | Rapor maili gonderildi |
| TUTANAK_CREATED | Tutanak olusturuldu |
| TUTANAK_UPDATED | Tutanak guncellendi |
| TUTANAK_SENT | Tutanak gonderildi |
