# ERTANSA Audit - Deploy Rehberi

## Sunucu: 51.38.209.143 (Windows)
## Domain: denetim.ertansa.com.tr

---

## BOLUM 1: WINDOWS SUNUCU HAZIRLIK

### 1.1 - Node.js Kur
Sunucuda tarayiciyi ac ve indir:
- https://nodejs.org/en/download (LTS v20)
- Kurarken "Add to PATH" secenegini isaretle

Kurulumu dogrula (CMD veya PowerShell):
```powershell
node --version
npm --version
```

### 1.2 - PM2 Kur (Process Manager)
```powershell
npm install -g pm2 pm2-windows-startup
```

### 1.3 - Git Kur (yoksa)
- https://git-scm.com/download/win

---

## BOLUM 2: PROJEYI SUNUCUYA YUKLE

### 2.1 - Proje dosyalarini kopyala
Yerel bilgisayarindan sunucuya kopyalama secenekleri:

**Secenek A: Git ile (onerilir)**
```powershell
cd C:\
git clone <repo-url> ertansa-audit
cd ertansa-audit
```

**Secenek B: Manuel kopyalama**
Projeyi zip'le, sunucuya Remote Desktop ile baglan, `C:\ertansa-audit` klasorune cikart.

### 2.2 - Bagimliliklari kur
```powershell
cd C:\ertansa-audit
npm install
cd apps\backend
npm install
cd ..\web
npm install
cd ..\..
```

---

## BOLUM 3: POSTGRESQL AYARLARI

### 3.1 - Veritabani olustur
pgAdmin veya psql ile:
```sql
CREATE DATABASE ertansa_audit;
```

### 3.2 - Backend .env ayarla
`C:\ertansa-audit\apps\backend\.env` dosyasini duzenle:
```
DATABASE_URL="postgresql://postgres:SIFREN@127.0.0.1:5432/ertansa_audit?schema=public"
JWT_SECRET="cok-guclu-rastgele-bir-secret-key-buraya-yaz"
PORT=4000
UPLOAD_DIR="./uploads"
NODE_ENV=production
CORS_ORIGIN=https://denetim.ertansa.com.tr
```

### 3.3 - Veritabani tablolarini olustur
```powershell
cd C:\ertansa-audit\apps\backend
npx prisma migrate deploy
```

### 3.4 - Seed data yukle (istege bagli)
```powershell
npx prisma db push
npx tsx prisma/seed.ts
```
veya pgAdmin ile `supabase/migrations/` klasorundeki SQL dosyalarini calistir.

---

## BOLUM 4: BACKEND DEPLOY

### 4.1 - Build
```powershell
cd C:\ertansa-audit\apps\backend
npm run build
```

### 4.2 - Uploads klasoru olustur
```powershell
mkdir C:\ertansa-audit\apps\backend\uploads
```

### 4.3 - PM2 ile baslat
```powershell
cd C:\ertansa-audit\apps\backend
pm2 start dist/index.js --name "ertansa-api"
pm2 save
```

### 4.4 - Test et
```powershell
curl http://localhost:4000/api/health
```
`{"status":"ok"}` gelmeli.

---

## BOLUM 5: WEB (NEXT.JS) DEPLOY

### 5.1 - .env ayarla
`C:\ertansa-audit\apps\web\.env.local` dosyasini duzenle:
```
NEXT_PUBLIC_API_URL=https://denetim.ertansa.com.tr
```

### 5.2 - Build
```powershell
cd C:\ertansa-audit\apps\web
npm run build
```

### 5.3 - PM2 ile baslat
```powershell
pm2 start npm --name "ertansa-web" -- start -- -p 3001
pm2 save
```

---

## BOLUM 6: REVERSE PROXY (IIS veya Nginx)

### Secenek A: IIS ile (Windows'da varsayilan)

1. **IIS'i etkinlestir:** Server Manager > Add Roles > Web Server (IIS)

2. **URL Rewrite & ARR modulleri kur:**
   - https://www.iis.net/downloads/microsoft/url-rewrite
   - https://www.iis.net/downloads/microsoft/application-request-routing

3. **IIS Manager'da yeni site olustur:**
   - Site name: ertansa-audit
   - Physical path: C:\inetpub\ertansa (bos klasor)
   - Binding: denetim.ertansa.com.tr, port 80

4. **web.config olustur** (`C:\inetpub\ertansa\web.config`):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <!-- API istekleri backend'e (port 4000) -->
        <rule name="API Proxy" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://localhost:4000/api/{R:1}" />
        </rule>
        <!-- Upload dosyalari -->
        <rule name="Uploads Proxy" stopProcessing="true">
          <match url="^uploads/(.*)" />
          <action type="Rewrite" url="http://localhost:4000/uploads/{R:1}" />
        </rule>
        <!-- Diger her sey web'e (port 3001) -->
        <rule name="Web Proxy" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://localhost:3001/{R:1}" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

5. **ARR'yi etkinlestir:** IIS Manager > Server > Application Request Routing > Server Proxy Settings > Enable proxy

### Secenek B: Nginx ile

1. **Nginx indir:** https://nginx.org/en/download.html (Windows zip)
2. `C:\nginx` klasorune cikart
3. `C:\nginx\conf\nginx.conf` duzenle:

```nginx
worker_processes 1;
events { worker_connections 1024; }

http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile      on;

    server {
        listen 80;
        server_name denetim.ertansa.com.tr;

        client_max_body_size 50M;

        # API istekleri
        location /api/ {
            proxy_pass http://127.0.0.1:4000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Upload dosyalari
        location /uploads/ {
            proxy_pass http://127.0.0.1:4000;
        }

        # Web (Next.js)
        location / {
            proxy_pass http://127.0.0.1:3001;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
}
```

4. Nginx'i baslat:
```powershell
cd C:\nginx
start nginx
```

---

## BOLUM 7: SSL SERTIFIKASI

### Win-ACME ile ucretsiz SSL (Let's Encrypt):
1. https://www.win-acme.com/ adresinden indir
2. Calistir ve domain seceneklerini takip et:
```powershell
C:\win-acme\wacs.exe
```
3. `denetim.ertansa.com.tr` icin sertifika olustur
4. IIS/Nginx otomatik yapilandirilacak

---

## BOLUM 8: DNS AYARI

Domain saglayin panelinden (orn. Turhost, Natro, Cloudflare):

| Tip  | Ad                       | Deger          |
|------|--------------------------|----------------|
| A    | denetim.ertansa.com.tr   | 51.38.209.143  |

DNS yayilmasi 5-30 dakika surebilir.

---

## BOLUM 9: SON KONTROL

Sunucuda PowerShell'de:
```powershell
# Servisleri kontrol et
pm2 status

# API testi
curl https://denetim.ertansa.com.tr/api/health

# Web testi
# Tarayicida: https://denetim.ertansa.com.tr
```

---

## BOLUM 10: ANDROID APK OLUSTURMA

### 10.1 - Expo hesabi
- https://expo.dev adresinden ucretsiz hesap olustur

### 10.2 - EAS CLI kur (yerel bilgisayarda)
```bash
npm install -g eas-cli
eas login
```

### 10.3 - APK build baslat
```bash
cd apps/mobile
eas build -p android --profile preview
```

Bu komut:
- Kodu Expo sunucularina yukler
- Bulutta APK olusturur (~10-15 dk)
- Indirme linki verir

### 10.4 - APK indir
Build bitince terminalde link gosterilir veya:
- https://expo.dev hesabinda Builds sekmesinden indir
- APK'yi telefona yukle ve kur

---

## HIZLI KOMUT OZETI (Sunucuda sirayla)

```powershell
# 1. Proje dosyalarini kopyala
cd C:\ertansa-audit

# 2. Bagimliliklari kur
npm install
cd apps\backend && npm install && cd ..
cd apps\web && npm install && cd ..\..

# 3. Veritabani
cd apps\backend
npx prisma migrate deploy
cd ..\..

# 4. Backend build & baslat
cd apps\backend
npm run build
pm2 start dist/index.js --name "ertansa-api"
cd ..\..

# 5. Web build & baslat
cd apps\web
npm run build
pm2 start npm --name "ertansa-web" -- start -- -p 3001
cd ..\..

# 6. PM2 kaydet
pm2 save
pm2 startup
```
