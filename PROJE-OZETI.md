# Trendyol Yorum Sistemi — Proje Özeti

Bu dosya, projenin ne olduğunu ve bugüne kadar (özellikle bu oturumda) neler
yapıldığını özetler. Gelecekte "ne durumdaydık" diye bakmak için buraya
dönebilirsin.

## Proje ne yapıyor

Trendyol'daki kendi ürünlerinin gerçek müşteri yorumlarını periyodik olarak
çeken, filtrelenebilir bir REST API, gömülebilir bir JS widget'ı ve bir admin
panel üzerinden sunan bir sistem. Artık **çoklu-müşteri (multi-tenant) bir
SaaS** — birden fazla müşteri, kendi hesabıyla giriş yapıp sadece kendi
ürün/yorum verisini görüyor.

**Stack:** Next.js 16 (App Router) + TypeScript · PostgreSQL + Prisma
(Supabase) · Playwright (scraper) · node-cron (zamanlama) · Vitest (test) ·
Vercel (hosting, GitHub push'ta otomatik deploy).

## Mimari, kısaca

- **Web uygulaması** (admin panel + API + widget): Vercel'de, serverless.
- **Scraper worker**: Vercel'de ÇALIŞAMIYOR — Trendyol, Cloudflare üzerinden
  hem veri merkezi IP'lerini hem headless tarayıcıları engelliyor. Bu yüzden
  worker, **residential IP'li, sürekli açık ayrı bir Windows bilgisayarda**
  (görünür/headed Chromium ile) çalışıyor, Windows Görev Zamanlayıcı'daki
  **"TrendyolYorumScraper"** görevi tetikliyor.
- **Veritabanı**: Tüm hesapların verisi aynı Postgres'te, `accountId` ile
  izole edilmiş (satır bazlı izolasyon, ayrı veritabanı değil).
- **Widget/public API** (`/api/v1/**`): hesap kavramından bağımsız, doğrudan
  ürün ID'siyle çalışır — müşterinin kendi sitesine gömdüğü script budur.

## Bu oturumda yapılanlar (kronolojik)

### 1. Admin panel kullanılabilirlik ve tasarım
- Sidebar navigasyon + KPI kartları ile yeniden tasarım (bir mockup'tan
  ilham alındı ama projenin kendi CSS değişken tabanlı tasarım sistemine
  uyarlandı — Tailwind değil).
- Renk paleti birkaç iterasyon sonunda Apple tarzı nötr + mavi tonlarda
  sabitlendi.
- Ürünler/Yorumlar/Scraper İzleme sayfalarına: arama, filtre, sıralama,
  toplu seçim + toplu Durdur/Başlat, toast bildirimleri, sayfalama (15/sayfa),
  ürün serisi gruplama.
- Sidebar'da canlı sistem durumu göstergesi (`/api/admin/health`'e bağlı).
- Bug fix: sol panel sayfa kaydırılınca kayboluyordu — `100vh` + doğru
  `overflow` yönetimiyle düzeltildi.
- **Mobil uyumluluk**: Ürünler ve Scraper İzleme tablolarındaki yatay
  kaydırmalı tablolar, telefonda kart görünümüne çevrildi (`data-label` +
  CSS `::before` tekniği, header satırına gerek kalmadan). Filtreler,
  sayfalama, butonlar da telefon genişliğinde düzeltildi.

### 2. Multi-tenant SaaS dönüşümü (asıl büyük iş)

Kullanıcının açık talimatı: **"enwood sadece pilot müşteri, koda hiçbir yerde
özel olarak bağlanmasın, yeni müşteri enwood'la ilgili hiçbir şey görmesin."**

- **Faz 1 — Hesap modeli + gerçek giriş**
  - `Account` (kiracı) ve `User` (giriş yapan kişi) tabloları eklendi,
    `Product.accountId` eklendi (başta nullable, geriye dönük göç için).
  - `scripts/create-account.ts`: herhangi bir müşteri için hesap+kullanıcı
    oluşturan genel script (kodda hiçbir müşteri adı hardcode edilmedi).
  - Eski tek şifreli `ADMIN_PASSWORD` tamamen kaldırıldı; giriş artık gerçek
    email + bcrypt ile hash'lenmiş şifre.
  - Sidebar/Ürünler sayfasındaki marka adı artık build-time env değişkeninden
    değil, giriş yapan hesabın gerçek adından geliyor.
- **Faz 2 — Tam izolasyon**
  - Ürün PATCH/DELETE, yorum moderasyonu, tek ürün tarama, toplu içe
    aktarma, scrape logları — hepsi artık "bu kayıt gerçekten senin hesabına
    mı ait" kontrolünden geçiyor. Önceden sadece "giriş yapmış mısın"
    kontrol ediliyordu; bu, başka bir hesabın verisini ID tahmin ederek
    görmeyi/değiştirmeyi teorik olarak mümkün kılıyordu.
- **Faz 3 — Hesap ayarları**
  - `/admin/settings`: kendi şifreni değiştirme, ekip üyesi ekleme/çıkarma
    (email servisi olmadığı için şifreyi sen belirleyip ayrıca iletiyorsun).
- **Temizlik**: `Product.accountId` veritabanı seviyesinde de zorunlu
  (`NOT NULL`) hale getirildi — bir daha asla sahipsiz/görünmez ürün
  oluşamaz. Bunu bozacak iki eski local script de (`bulk-import-from-seller.ts`,
  `scrape-once.ts`) düzeltildi.
- Her fazda: kod yazıldı → lint/typecheck/test → production'a deploy →
  gerçek `enwood@ornek.com` hesabıyla canlıda doğrulama yapıldı.

### 3. Operasyonel bulgular ve düzeltmeler
- **Yeni müşteri ekleme süreci** README'ye net bir checklist olarak
  yazıldı (hesap aç → ürünleri ekle → giriş bilgisini ilet → tarama
  otomatik başlar → widget kodunu ver).
- **"Gecikme Var" teşhisi**: Kod hatası değil — worker'ı çalıştıran
  Görev Zamanlayıcı görevi **bu bilgisayarda değil, başka bir makinede**
  (`scripts/run-scheduled-scrape-prod.ps1` içindeki yol `C:\Users\asrin\...`
  gösteriyor). O makineye erişimim yok; kontrol için adımlar sana verildi.
- **Tarama sıklığı 3 saatten haftada bire düşürüldü** — worker kapasitesini
  korumak (ikinci müşteri geldiğinde tek makine/tek residential IP sınırına
  daha az yaklaşmak) için. `/api/admin/health` eşiği buna göre 8 güne
  çıkarıldı. Production'daki gerçek Görev Zamanlayıcı görevinin
  zamanlamasını değiştirmek için gereken PowerShell komutu README'de.

## Şu an bilinen kısıtlar / açık konular

- **Worker kapasitesi**: Tek bilgisayar, tek residential IP, tüm hesapların
  ürünlerini sırayla tarıyor. Haftalık taramayla şimdilik rahat ama müşteri
  sayısı ciddi artarsa ikinci bir worker makinesi gerekir.
- **Email servisi yok**: Ekip üyesi davetleri ve gelecekte olası şifre
  sıfırlama akışları için hâlâ manuel (WhatsApp/e-posta ile elden iletim).
- **Worker'ın kendisi bu bilgisayarda değil**: "asrin" makinesinin şu an
  sağlıklı çalışıp çalışmadığı doğrulanmadı — bunu kontrol etmek sende.
- Kullanıcıya görünen daha büyük özellikler (Analytics/Genel Bakış sayfası,
  tüm ürünleri tek yerden gören bir "Review Inbox" gibi) konuşuldu ama henüz
  yapılmadı — istenirse sıradaki iş olabilir.

## Production erişim bilgileri

- Admin panel: https://trendyol-yorum-sistemi.vercel.app/admin/login
- Pilot hesabın giriş şifresi buraya (git'e) yazılmaz — sadece sende, ayrı ve
  güvenli bir yerde (parola yöneticisi vb.) tutulmalı. Gerekirse
  `/admin/settings` üzerinden değiştirebilirsin.
