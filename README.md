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
| `ADMIN_PASSWORD` | Admin paneline giriş şifresi (tek kullanıcı) |
| `SESSION_SECRET` | Oturum cookie'sini imzalayan HMAC anahtarı; en az 32 karakterlik rastgele bir dize kullanın |

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

`npm run build`, `next build`'den önce `npm run build:widget` çalıştırır; bu adım
`src/widget/widget.ts` dosyasını esbuild ile `public/widget/widget.js` bundle'ına
derler. Widget'ı tek başına yeniden derlemek için: `npm run build:widget`.

## Scraper

Tek bir ürünü elle taramak (ürün yoksa oluşturulur):

```bash
npm run scrape:once -- <trendyolProductId>
# örn: npm run scrape:once -- 1071760667
```

Zamanlanmış taramayı başlatmak (her 3 saatte bir, `isTracked=true` tüm ürünler sırayla):

```bash
npm run scheduler:start
```

Scraper nezaket kuralları: istekler arası 1-3 sn rastgele gecikme, aynı anda tek ürün,
429/403 durumunda 5s → 15s → 45s exponential backoff. Her çalıştırma `ScrapeLog`
tablosuna yazılır ve admin panelin `/admin/scrape-logs` sayfasında görünür.

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
xvfb-run -a npm run scrape:once -- <trendyolProductId>
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

`/admin/products` (giriş: `/admin/login`, `ADMIN_PASSWORD` ile).

- **Ürün Yönetimi:** Trendyol ürün URL'si yapıştırarak ürün ekleme (ID URL'deki
  `-p-<rakamlar>` deseninden çıkarılır), takibi durdurma/başlatma, "Çıkış Yap".
- **Yorum Moderasyonu:** `/admin/products/<id>/reviews` — yorumları gizle/göster.
- **Scraper İzleme:** `/admin/scrape-logs` — son çalıştırmalar, durum ve hata mesajları.

`/admin/*` ve `/api/admin/*` yolları `src/middleware.ts` tarafından imzalı oturum
cookie'si ile korunur.
