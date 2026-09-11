# Frontend

Bu proje tek bir Next.js (App Router) uygulaması içinde iki ayrı frontend barındırır:

1. **Admin paneli** — `src/app/admin` altında, React ile yazılmış, giriş yapılan bir yönetim arayüzü.
2. **Gömülebilir widget** — `src/widget` altında, vanilla TypeScript ile yazılıp ayrı bir script olarak derlenen, host sitelere `<script>` etiketiyle eklenen yorum widget'ı.

Ayrıca `src/app/page.tsx` projenin herkese açık tanıtım/karşılama sayfasıdır.

## Tech stack

- **Framework:** Next.js 16 (App Router), React 19
- **Dil:** TypeScript
- **Stil:** Düz CSS (`src/app/globals.css`), inline stiller; UI kütüphanesi yok
- **Widget derleme:** `scripts/build-widget.mjs` (esbuild) → widget, Next build'den ayrı olarak tek dosyalık bir JS bundle'a derlenir
- **State:** Sayfa bazlı React `useState`/`useEffect`, global state yönetimi yok

## Dizin yapısı

```
src/app/
├── page.tsx                    # Herkese açık tanıtım sayfası
├── layout.tsx / globals.css    # Kök layout ve stiller
├── admin/
│   ├── login/page.tsx          # Admin giriş sayfası
│   └── (app)/
│       ├── layout.tsx          # Giriş yapılmış admin shell (nav, logout)
│       ├── products/page.tsx   # Ürün listesi, ekleme, widget kodu üretme
│       ├── products/[id]/reviews/page.tsx  # Tek ürünün yorumları
│       └── scrape-logs/page.tsx            # Scraper çalışma logları
└── api/                         # Route handler'lar (admin + public v1 API)

src/widget/
├── widget.ts                   # Script'in giriş noktası — <script data-*> özniteliklerini okur
├── render.ts                   # Shadow DOM içine widget UI'ını çizen asıl mantık
└── render.test.ts              # Widget render testleri (vitest)
```

## Admin paneli

- **Auth:** `src/app/admin/login/page.tsx` üzerinden giriş yapılır; oturum durumu `src/lib/auth` ve `adminFetch` (`src/lib/adminFetch`) yardımcı fonksiyonu üzerinden yönetilir. Girişsiz erişimde `/admin/login`'e yönlendirilir.
- **Layout:** `(app)/layout.tsx` — üstte marka adı, "Ürünler" ve "Scraper İzleme" linkleri, sağda çıkış butonu.
- **Ürünler sayfası** (`products/page.tsx`, ~520 satır): Takip edilen ürünleri listeler; Trendyol URL'i ile yeni ürün ekleme, minimum yıldız filtresi, ürün başına widget embed kodu üretip kopyalama, scrape tetikleme/durum gösterimi gibi işlevleri içerir.
- **Ürün yorumları sayfası** (`products/[id]/reviews/page.tsx`): Seçili ürünün çekilen yorumlarını listeler/yönetir.
- **Scrape logları** (`scrape-logs/page.tsx`): Periyodik scraper çalışmalarının geçmişini ve durumunu gösterir.

Tüm admin sayfaları `"use client"` bileşenleridir ve veriyi doğrudan `/api/admin/*` route handler'larından `fetch` ile çeker.

## Widget (`src/widget`)

Host sitelere tek satır script ile gömülen, bağımsız (React'a bağımlı olmayan) bir widget:

- `widget.ts`: `document.currentScript`'ten `data-*` özniteliklerini okur:
  - `data-product-id` veya `data-external-ref` (host sitenin kendi ürün kodu)
  - `data-store-id` (yanlış siteye yapıştırılmayı engellemek için)
  - `data-api-base-url` (verilmezse script'in kendi origin'i kullanılır)
  - `data-accent-color`, `data-hide-filters`, `data-store-url`, `data-carousel`, `data-hide-summary`
  - Script etiketinden hemen sonra bir `<div>` oluşturup `renderReviewWidget`'ı çağırır.
- `render.ts`: Shadow DOM içinde (host sayfanın CSS'iyle çakışmasın diye) yıldız dağılımı, filtreler, yorum kartları/carousel gibi UI'ı elle (string template ile) render eder; `/api/v1/products/*` uçlarından veri çeker.
- Ayrı olarak `npm run build:widget` (esbuild, bkz. `scripts/build-widget.mjs`) ile tek dosyalık bir bundle'a derlenir ve `next build` sürecine dahildir.

## Geliştirme

```bash
npm run dev          # Next.js dev server
npm run build:widget # Sadece widget bundle'ını derle
npm run build         # prisma migrate + widget build + next build
npm run test          # vitest (widget/render.test.ts dahil)
```
