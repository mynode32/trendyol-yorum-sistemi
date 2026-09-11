# Trendyol Yorum Çekme & Gösterim Sistemi

Trendyol'daki kendi ürünlerinizin gerçek müşteri yorumlarını periyodik olarak çekip;
filtrelenebilir bir REST API, gömülebilir bir JS widget'ı ve basit bir admin panel
üzerinden sunar.

Stack: Next.js (App Router) + TypeScript · PostgreSQL + Prisma · Playwright (scraper)
· node-cron (zamanlama) · Vitest (test).

Tasarım ve plan dokümanları:
`docs/superpowers/specs/2026-09-08-trendyol-yorum-sistemi-design.md`,
`docs/superpowers/plans/2026-09-08-trendyol-yorum-sistemi.md`.

## Ortam değişkenleri

`.env.example` dosyasını `.env`'e kopyalayın ve doldurun:

| Değişken | Açıklama |
|---|---|
| `DATABASE_URL` | PostgreSQL bağlantı adresi, örn. `postgresql://trendyol:trendyol@localhost:5432/trendyol_reviews`. Supabase kullanılıyorsa: pooled (pgbouncer, port 6543) bağlantı. |
| `DIRECT_URL` | Migration'lar için doğrudan (havuzsuz) bağlantı adresi. Yerelde `DATABASE_URL` ile aynı olabilir; Supabase'de port 5432 olan bağlantı adresi kullanılır. |
| `SESSION_SECRET` | Oturum cookie'sini imzalayan HMAC anahtarı; en az 32 karakterlik rastgele bir dize kullanın |
| `SCRAPE_ALERT_WEBHOOK_URL` | Opsiyonel: başarısız scheduled scrape özetini JSON POST olarak alan alarm webhook'u |

Sistem çoklu-hesap (multi-tenant): her müşteri kendi `Account`/`User` satırıyla
kendi email/şifresiyle giriş yapar, sadece kendi ürünlerini görür.

### Yeni müşteri ekleme

1. **Hesabı oluştur** (bu bilgisayarda, production `DIRECT_URL`'i ile):
   ```bash
   npx tsx scripts/create-account.ts <email> <şifre> <hesap-adı>
   ```
   Hesap ve ilk kullanıcı oluşur, ürünsüz başlar.
2. **Ürünleri ekle** — iki yoldan biri:
   - Müşteri kendi giriş bilgileriyle `/admin/products`'a girip Trendyol ürün
     URL'lerini tek tek yapıştırır, veya
   - Sen bu bilgisayarda mağazanın tamamını tek seferde çekersin:
     ```bash
     npm run bulk-import -- <hesap-email> <mağaza-linki> [mağaza-etiketi] [minPuan]
     ```
3. **Giriş bilgilerini ilet** — email + belirlediğin şifreyi müşteriye ayrıca
   (WhatsApp/e-posta vb.) gönder; panelden şifresini kendisi değiştirebilir
   (`/admin/settings`).
4. **Tarama otomatik başlar** — yeni ürünler, zaten çalışan tek paylaşımlı
   worker'ın (`npm run scheduler:start`, haftada bir) taradığı listeye
   otomatik dahil olur; müşteri başına ayrı bir worker kurulumu gerekmez.
5. **Widget kodunu ver** — admin panelde her ürünün "Widget kodu" butonu,
   müşterinin kendi sitesine yapıştıracağı `<script>` etiketini verir.

Tek worker tüm hesapların ürünlerini sırayla tarar (bkz. "Scraper" bölümü) —
bu, tek bir residential-IP makineye bağlı bir kapasite sınırıdır. Haftalık
tarama bu sınırı ciddi ölçüde gevşetir, ama müşteri sayısı çok artarsa
taramalar haftalık pencereye de sığmayabilir; o noktada ikinci bir worker
makinesi (aynı `DATABASE_URL`'e bağlı, ayrı bir residential IP)
eklemek gerekir.

Oturumlar 24 saat sonra sunucu tarafında geçersiz olur (`MAX_SESSION_AGE_MS`).
`SESSION_SECRET` değiştirilirse mevcut tüm oturumlar anında geçersiz olur.
Admin girişinde aynı IP'den 15 dakika içinde 5 başarısız denemeden sonra
`429 RATE_LIMITED` döner (bkz. `src/lib/auth/rateLimit.ts`).

## Yerel kurulum

```bash
npm install
npx playwright install chromium     # scraper için
docker-compose up -d db             # yerel Postgres
npx prisma migrate dev              # şemayı uygula
npm run dev                         # http://localhost:3000
```

Testler canlı bir Postgres'e karşı çalışır (mock DB yok):

```bash
npm run test
```

## Production'a alma

```bash
npm ci
npx prisma migrate deploy           # production'da 'migrate dev' KULLANMAYIN
npm run build                       # widget bundle + next build
npm run start
```

Production worker, hata alarmı, yedekleme ve veri saklama kontrol listesi için
[`docs/production-runbook.md`](docs/production-runbook.md) belgesini uygulayın.

`npm run build`, `next build`'den önce `npm run build:widget` çalıştırır; bu adım
`src/widget/widget.ts` dosyasını esbuild ile `public/widget/widget.js` bundle'ına
derler. Widget'ı tek başına yeniden derlemek için: `npm run build:widget`.

## Scraper

Tek bir ürünü elle taramak (ürün yoksa oluşturulur):

```bash
npm run scrape:once -- <trendyolProductId> <hesap-email>
# örn: npm run scrape:once -- 1071760667 enwood@ornek.com
```

`<hesap-email>` sadece ürün henüz yoksa (yeni oluşturulurken) hangi hesaba
bağlanacağını belirler — ürün zaten takipteyse yok sayılır.

Zamanlanmış taramayı başlatmak (haftada bir, Pazartesi 03:00, `isTracked=true` tüm ürünler sırayla):

```bash
npm run scheduler:start
```

Scraper nezaket kuralları: istekler arası 1-3 sn rastgele gecikme, aynı anda tek ürün,
429/403 durumunda 5s → 15s → 45s exponential backoff. Her çalıştırma `ScrapeLog`
tablosuna yazılır ve admin panelin `/admin/scrape-logs` sayfasında görünür.

### Production worker'ın zamanlamasını değiştirmek

Production'da `npm run scheduler:start` değil, worker makinesindeki Windows
Görev Zamanlayıcı'nın **"TrendyolYorumScraper"** görevi kullanılıyor — bu görev
`scripts/run-scheduled-scrape-prod.ps1`'i (→ `npm run scheduler:run-once`, tek
seferlik) tetikliyor. Zamanlamasını (örn. üç saatte birden haftada bire)
değiştirmek için, **o worker makinesinde** PowerShell'de:

```powershell
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 3am
Set-ScheduledTask -TaskName "TrendyolYorumScraper" -Trigger $trigger
```

Bu, görevin işlemini (action) değiştirmeden sadece ne zaman çalışacağını
günceller. Değişikliği doğrulamak için: `Get-ScheduledTaskInfo -TaskName
"TrendyolYorumScraper"`.

### ⚠️ Dağıtım notu: scraper GÖRÜNÜR (headed) bir tarayıcı açar

`src/lib/scraper/trendyolClient.ts` Chromium'u **`headless: false`** ile başlatır.
Bu kasıtlıdır ve zorunludur: Cloudflare, headless Chromium'u daha ana sayfa ısınma
isteğinde 403 ile engelliyor (otomasyon parmak izi); aynı istek headed modda 200
dönüyor. Bu satırı "düzeltme" amacıyla `headless: true` yapmayın — scraper çalışmaz.

Sonucu: **scraper'ı çalıştıran her ortamın bir ekranı (display) olmalıdır.** Ekransız
bir Linux sunucuda sanal ekran kullanın:

```bash
sudo apt-get install -y xvfb
xvfb-run -a npm run scheduler:start
# tek seferlik tarama için de aynısı:
xvfb-run -a npm run scrape:once -- <trendyolProductId> <hesap-email>
```

Alternatif olarak masaüstü ortamı olan bir makinede (veya X sunucusu olan bir
container imajında) çalıştırın. Next.js web uygulamasının kendisi bu gereksinime
tabi değildir — yalnızca scraper süreçleri (`scrape:once`, `scheduler:start`) için
geçerlidir; istenirse web uygulamasından ayrı bir makinede çalıştırılabilir.

## Public API

Base: `/api/v1` (kimlik doğrulaması yok, salt-okunur, CORS açık `*`).

- `GET /api/v1/products/:id/reviews` — filtrelenmiş/sayfalanmış yorum listesi.
  Parametreler: `stars` (örn. `4,5`), `dateFrom`, `dateTo` (ISO tarih), `hasPhoto`
  (`true`/`false`), `q` (metin araması), `sort`
  (`newest`|`oldest`|`mostHelpful`|`longest`, varsayılan `newest`), `page`,
  `pageSize` (varsayılan 20, üst sınır 100).
- `GET /api/v1/products/:id/summary` — ortalama puan, toplam yorum, yıldız dağılımı.

Yalnızca `isApproved=true` ve `isHidden=false` yorumlar döner. Tüm hatalar
`{ "error": { "code": "...", "message": "..." } }` formatındadır: geçersiz parametre
`400 INVALID_QUERY`, bilinmeyen ürün `404 PRODUCT_NOT_FOUND`.

## Widget'ı sitenize gömme

Yorumların görünmesini istediğiniz yere tek bir script etiketi koyun:

```html
<script
  src="https://sizin-sunucunuz.example.com/widget/widget.js"
  data-product-id="<Product.id>"
></script>
```

- `data-product-id`: bu sistemdeki `Product.id` (admin panelde ürün eklendiğinde
  oluşan cuid) — Trendyol ürün ID'si değil.
- `data-api-base-url` (opsiyonel): API kökü. Verilmezse script'in kendi `src`
  origin'i kullanılır; API ile widget aynı sunucuda barındığı sürece gerekmez.

Widget, script etiketinin hemen ardına bir `<div>` ekler ve özet + yorum listesini
render eder. API'ye ulaşılamazsa host sayfayı bozmadan sessizce bir hata mesajı
gösterir. `public/widget-demo.html` yerel deneme sayfasıdır
(`http://localhost:3000/widget-demo.html`).

## Admin panel

`/admin/products` (giriş: `/admin/login`, email + şifre ile — bkz. yukarıdaki
`scripts/create-account.ts`).

- **Ürün Yönetimi:** Trendyol ürün URL'si yapıştırarak ürün ekleme (ID URL'deki
  `-p-<rakamlar>` deseninden çıkarılır), tek ürün için **Şimdi Tara**, takibi durdurma/başlatma, "Çıkış Yap".
- **Yorum Moderasyonu:** `/admin/products/<id>/reviews` — yorumları gizle/göster.
- **Scraper İzleme:** `/admin/scrape-logs` — son çalıştırmalar, durum ve hata mesajları.

`/admin/*` ve `/api/admin/*` yolları `src/middleware.ts` tarafından imzalı oturum
cookie'si ile korunur.
