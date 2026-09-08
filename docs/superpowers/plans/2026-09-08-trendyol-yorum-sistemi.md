# Trendyol Yorum Sistemi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kullanıcının Trendyol'daki kendi ürünlerinin gerçek müşteri yorumlarını periyodik olarak çekip, yıldız/tarih/fotoğraf/anahtar-kelime filtreleriyle bir REST API ve embeddable widget üzerinden mevcut web sitesine sunmak; basit bir admin panelden ürün ve yorum yönetimi yapmak.

**Architecture:** Next.js (App Router, TypeScript) tek repo içinde hem API route'larını hem admin panel sayfalarını barındırır. Ayrı bir scraper modülü (`src/lib/scraper`) Trendyol'un iç JSON endpoint'ini nazik bir hızda çeker, `Product`/`Review`/`ScrapeLog` tablolarına (PostgreSQL + Prisma) dedup ederek yazar. Widget, API'yi tüketen bağımsız bir JS bundle'ıdır.

**Tech Stack:** Next.js 14+ (App Router) · TypeScript · PostgreSQL · Prisma ORM · Zod (doğrulama) · Vitest (test) · node-cron (zamanlama) · Docker Compose (yerel Postgres) · Playwright (scraper HTTP katmanı — bkz. Task 5 revizyon notu)

**Task 5 revizyon notu (2026-09-08, implementasyon sırasında):**
1. Task 5'in orijinal tasarımı (sade Node `fetch`) gerçek siteye karşı doğrulanınca çalışmadı: Cloudflare, Node'un TLS parmak izini (JA3/JA4) tarayıcı-dışı istemci olarak tanıyıp 403 ile engelliyor — doğru çerezlerle bile. Kullanıcı onayıyla scraper'ın HTTP katmanı Playwright'a (Chromium) geçirildi.
2. İlk Playwright denemesi de (headless) gerçek siteye karşı başarısız oldu: Cloudflare headless Chromium'u da ana sayfa ısınma isteğinde 403 ile engelliyor (muhtemelen otomasyon parmak izi — `navigator.webdriver` vb. — TLS değil). **headed** modda (`headless: false`) aynı istek 200 dönüyor, gerçek çerezler alınıyor — bu makinede doğrulandı. Ayrıca API isteğine `credentials: 'include'` eklenmesi gerekiyordu (çapraz-origin istekte çerezler otomatik gitmiyor). Kullanıcı onayıyla Task 5 `headless: false` + `credentials: 'include'` ile devam ediyor. **Production'da ekransız (headless sunucu) ortamda çalıştırmak için Xvfb (veya benzeri sanal ekran) gerekecek** — bu bir deployment/altyapı notu, Task 5'in kod kapsamı dışında.

Aşağıdaki Task 5 metni bu revize (headed + credentials) tasarımı yansıtır. Detaylar: `.superpowers/sdd/2026-09-08-trendyol-yorum-sistemi/task-5-report.md` ve ledger'daki Ruling 7/8.

**Spec:** `docs/superpowers/specs/2026-09-08-trendyol-yorum-sistemi-design.md`

## Global Constraints

- Yorumlar gerçek veridir; hiçbir yerde sentetik/üretilmiş yorum kullanılmaz.
- Dedup: `Review.trendyolReviewId` unique kısıtı ile sağlanır; tekrar çekimlerde sadece yeni kayıtlar eklenir.
- Scraping nezaket kuralları: istekler arası 1-3 saniye rastgele gecikme, aynı anda yalnızca tek ürün işlenir (paralel istek yok).
- Hata durumunda exponential backoff: 5s → 15s → 45s, 3 denemeden sonra ürün taraması o çalıştırma için başarısız sayılır.
- API filtreli sorgular yalnızca `isApproved=true AND isHidden=false` yorumları döner.
- API sayfalama: varsayılan `pageSize=20`, maksimum `pageSize=100`.
- Tüm API hataları `{ error: { code, message } }` formatında döner.

---

## Task 1: Proje İskeleti & Ortam Kurulumu

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `.env.example`, `.gitignore`
- Create: `docker-compose.yml`
- Create: `vitest.config.ts`

**Interfaces:**
- Consumes: yok (ilk görev)
- Produces: çalışan bir Next.js + TypeScript projesi, `npm run dev`, `npm run test`, `npm run build` komutları; yerel Postgres için `docker-compose up -d db`

- [ ] **Step 1: Next.js projesini oluştur**

```bash
npx create-next-app@latest . --typescript --app --eslint --src-dir --import-alias "@/*" --no-tailwind
```

- [ ] **Step 2: Test ve yardımcı bağımlılıkları ekle**

```bash
npm install --save-dev vitest @vitejs/plugin-react vite-tsconfig-paths
npm install zod
```

- [ ] **Step 3: `vitest.config.ts` oluştur**

**Revize (Task 10 sırasında eklendi):** `fileParallelism: false` zorunlu — bu projedeki entegrasyon testlerinin çoğu aynı canlı yerel Postgres'e karşı çalışır (mock DB yok); Vitest'in varsayılan paralel dosya çalıştırması, farklı test dosyalarının `beforeEach`'lerinin (`product.deleteMany()` vb.) birbiriyle yarışmasına ve aralıklı `Foreign key constraint violated` hatalarına yol açıyor (bkz. ledger Ruling 11).

```typescript
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    fileParallelism: false,
  },
});
```

- [ ] **Step 4: `package.json` script'lerine test komutunu ekle**

`package.json` içindeki `"scripts"` bloğuna ekle:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: `docker-compose.yml` oluştur (yerel Postgres)**

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: trendyol
      POSTGRES_PASSWORD: trendyol
      POSTGRES_DB: trendyol_reviews
    ports:
      - "5432:5432"
    volumes:
      - db_data:/var/lib/postgresql/data

volumes:
  db_data:
```

- [ ] **Step 6: `.env.example` oluştur**

```
DATABASE_URL="postgresql://trendyol:trendyol@localhost:5432/trendyol_reviews"
ADMIN_PASSWORD="changeme"
SESSION_SECRET="changeme-32-char-random-string"
```

`.env.example` dosyasını `.env`'e kopyala:

```bash
cp .env.example .env
```

- [ ] **Step 7: Doğrulama — dev server ayağa kalkıyor mu**

```bash
docker-compose up -d db
npm run dev
```

Beklenen: `http://localhost:3000` açılıyor, hata yok. `Ctrl+C` ile durdur.

- [ ] **Step 8: Commit**

```bash
git init
git add .
git commit -m "chore: proje iskeleti, Next.js + TypeScript + Vitest + Postgres kurulumu"
```

---

## Task 2: Veritabanı Şeması & Prisma İstemcisi

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`
- Test: `src/lib/db.test.ts`

**Interfaces:**
- Consumes: `DATABASE_URL` env değişkeni (Task 1)
- Produces: `import { prisma } from "@/lib/db"` — tüm sonraki görevler bu singleton'ı kullanır. Modeller: `Product`, `Review`, `ScrapeLog` (alan adları spec bölüm 4 ile birebir).

- [ ] **Step 1: Prisma'yı kur ve başlat**

```bash
npm install prisma @prisma/client
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: `prisma/schema.prisma` içeriğini yaz**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Product {
  id                String      @id @default(cuid())
  trendyolProductId String      @unique
  trendyolUrl       String
  name              String
  isTracked         Boolean     @default(true)
  lastScrapedAt     DateTime?
  createdAt         DateTime    @default(now())
  reviews           Review[]
  scrapeLogs        ScrapeLog[]
}

model Review {
  id               String   @id @default(cuid())
  productId        String
  product          Product  @relation(fields: [productId], references: [id])
  trendyolReviewId String   @unique
  rating           Int
  comment          String
  authorName       String
  hasPhoto         Boolean  @default(false)
  photoUrls        String[] @default([])
  reviewDate       DateTime
  helpfulCount     Int      @default(0)
  isApproved       Boolean  @default(true)
  isHidden         Boolean  @default(false)
  createdAt        DateTime @default(now())

  @@index([productId, rating])
  @@index([productId, reviewDate])
}

model ScrapeLog {
  id           String    @id @default(cuid())
  productId    String
  product      Product   @relation(fields: [productId], references: [id])
  startedAt    DateTime  @default(now())
  finishedAt   DateTime?
  status       String
  newReviews   Int       @default(0)
  errorMessage String?
}
```

- [ ] **Step 3: İlk migration'ı oluştur**

```bash
npx prisma migrate dev --name init
```

Beklenen: migration başarıyla uygulanır, `prisma/migrations/` altında yeni klasör oluşur.

- [ ] **Step 4: `src/lib/db.ts` — Prisma client singleton**

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 5: Doğrulama testi yaz — `src/lib/db.test.ts`**

```typescript
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "./db";

describe("prisma client", () => {
  it("connects and can create/delete a product", async () => {
    const product = await prisma.product.create({
      data: {
        trendyolProductId: "test-123",
        trendyolUrl: "https://www.trendyol.com/test-123",
        name: "Test Ürün",
      },
    });
    expect(product.id).toBeDefined();
    expect(product.isTracked).toBe(true);

    await prisma.product.delete({ where: { id: product.id } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
```

- [ ] **Step 6: Testi çalıştır ve doğrula**

```bash
docker-compose up -d db
npm run test -- db.test.ts
```

Beklenen: PASS.

- [ ] **Step 7: Commit**

```bash
git add prisma src/lib/db.ts src/lib/db.test.ts .gitignore
git commit -m "feat: Prisma şeması ve DB client (Product, Review, ScrapeLog)"
```

---

## Task 3: Trendyol Yorum Endpoint'inin Keşfi & Örnek Veri

Bu görev diğerlerinden farklıdır: Trendyol'un yorumları getirdiği iç JSON endpoint'i dokümante edilmediği için (spec bölüm 13 — açık karar), önce gerçek bir ürün sayfası üzerinden bu endpoint tespit edilip örnek bir yanıt kaydedilmelidir. Sonraki tüm scraper görevleri bu örneğe dayanır.

**Files:**
- Create: `fixtures/sample-review-response.json`
- Create: `docs/trendyol-endpoint-notes.md`

**Interfaces:**
- Consumes: yok
- Produces: `fixtures/sample-review-response.json` (Task 4'te parser testinin girdisi), `docs/trendyol-endpoint-notes.md` (Task 5'te scraper client'ının hedef URL/header/parametre şablonu)

- [ ] **Step 1: Gerçek bir Trendyol ürün sayfasını tarayıcıda aç, DevTools → Network sekmesini aç**

Kendi ürünlerinizden birinin sayfasını açın, "Tüm Yorumları Gör" bölümüne gidin, Network sekmesinde `Fetch/XHR` filtresiyle yorumları getiren isteği bulun (URL'inde muhtemelen `review` geçer).

- [ ] **Step 2: İsteğin tam detayını not al**

`docs/trendyol-endpoint-notes.md` dosyasına şunları yaz:

```markdown
# Trendyol Yorum Endpoint Notları

- **URL şablonu:** (tespit edilen tam URL, örn. `https://public-mdc.trendyol.com/discovery-web-.../reviews?...`)
- **Method:** GET/POST
- **Gerekli header'lar:** (örn. User-Agent, Referer, varsa auth/cookie gereksinimi)
- **Query/body parametreleri:** sayfalama (page/offset), productId nasıl geçiliyor
- **Yanıt şeması:** yorum listesi hangi alan adlarıyla geliyor (id, rating, comment, userFullName, hasPhoto, photos/images, commentDateISOtype, helpfulCount vb.) — gerçek alan adlarını `fixtures/sample-review-response.json` ile birebir eşleştir
- **Rate limit gözlemi:** art arda birkaç istekte 429/403 alındı mı, ne kadar sürede
```

- [ ] **Step 3: Örnek yanıtı kaydet**

DevTools → ilgili isteğe sağ tık → "Copy → Copy Response" ile ham JSON'u al, en az 5-10 yorum içerecek şekilde `fixtures/sample-review-response.json` dosyasına kaydet (gerçek veri, kişisel bilgi içerse de bu dosya sadece yerel geliştirme/test amaçlıdır — repoya commit edilecek olması sorun oluşturuyorsa isimleri `Kullanıcı A` gibi maskele).

- [ ] **Step 4: Doğrulama**

`fixtures/sample-review-response.json` geçerli JSON mu kontrol et:

```bash
node -e "JSON.parse(require('fs').readFileSync('fixtures/sample-review-response.json', 'utf-8')); console.log('valid JSON')"
```

Beklenen: `valid JSON` yazdırılır.

- [ ] **Step 5: Commit**

```bash
git add fixtures/sample-review-response.json docs/trendyol-endpoint-notes.md
git commit -m "docs: Trendyol yorum endpoint keşfi ve örnek yanıt"
```

---

## Task 4: Scraper Parser (Ham JSON → Normalize Review)

**Files:**
- Create: `src/lib/scraper/parser.ts`
- Test: `src/lib/scraper/parser.test.ts`

**Interfaces:**
- Consumes: `fixtures/sample-review-response.json` (Task 3)
- Produces: `parseReviewResponse(raw: unknown): ParsedReview[]` ve `ParsedReview` tipi:
  ```typescript
  type ParsedReview = {
    trendyolReviewId: string;
    rating: number;
    comment: string;
    authorName: string;
    hasPhoto: boolean;
    photoUrls: string[];
    reviewDate: Date;
    helpfulCount: number;
  };
  ```
  Task 5 (persist) bu tipi ve fonksiyonu doğrudan kullanır.

- [ ] **Step 1: Başarısız testi yaz — `src/lib/scraper/parser.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseReviewResponse } from "./parser";

const fixture = JSON.parse(
  readFileSync(join(process.cwd(), "fixtures/sample-review-response.json"), "utf-8")
);

describe("parseReviewResponse", () => {
  it("parses raw Trendyol response into normalized reviews", () => {
    const result = parseReviewResponse(fixture);

    expect(result.length).toBeGreaterThan(0);
    const first = result[0];
    expect(typeof first.trendyolReviewId).toBe("string");
    expect(first.rating).toBeGreaterThanOrEqual(1);
    expect(first.rating).toBeLessThanOrEqual(5);
    expect(typeof first.comment).toBe("string");
    expect(typeof first.authorName).toBe("string");
    expect(typeof first.hasPhoto).toBe("boolean");
    expect(Array.isArray(first.photoUrls)).toBe(true);
    expect(first.reviewDate instanceof Date).toBe(true);
    expect(typeof first.helpfulCount).toBe("number");
  });
});
```

> Not: `parser.ts`'in gerçek alan eşlemesi (`trendyolReviewId`'nin ham yanıttaki hangi alana karşılık geldiği vb.) Task 3'te `docs/trendyol-endpoint-notes.md`'ye yazılan gerçek şemaya göre doldurulur. Aşağıdaki implementasyon, notlardaki alan adlarının yerine geçecek şekilde uyarlanmalıdır — yorum satırlarındaki `raw.<alan>` isimlerini gerçek yanıt şemasıyla değiştirin.

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

```bash
npm run test -- parser.test.ts
```

Beklenen: FAIL — `parseReviewResponse is not defined` veya modül bulunamadı hatası.

- [ ] **Step 3: `src/lib/scraper/parser.ts` implementasyonu**

```typescript
export type ParsedReview = {
  trendyolReviewId: string;
  rating: number;
  comment: string;
  authorName: string;
  hasPhoto: boolean;
  photoUrls: string[];
  reviewDate: Date;
  helpfulCount: number;
};

// Trendyol'un iç API yanıt zarfı; gerçek alan adları
// docs/trendyol-endpoint-notes.md içindeki keşfe göre güncellenmelidir.
type RawTrendyolReview = {
  id: number | string;
  rate: number;
  comment: string;
  userFullName: string;
  mediaFiles?: { url: string }[];
  commentDateISOtype: string;
  helpfulCount?: number;
};

type RawTrendyolResponse = {
  result?: {
    productReviews?: {
      content?: RawTrendyolReview[];
    };
  };
};

export function parseReviewResponse(raw: unknown): ParsedReview[] {
  const response = raw as RawTrendyolResponse;
  const items = response.result?.productReviews?.content ?? [];

  return items.map((item) => ({
    trendyolReviewId: String(item.id),
    rating: item.rate,
    comment: item.comment ?? "",
    authorName: item.userFullName ?? "Anonim",
    hasPhoto: (item.mediaFiles?.length ?? 0) > 0,
    photoUrls: (item.mediaFiles ?? []).map((m) => m.url),
    reviewDate: new Date(item.commentDateISOtype),
    helpfulCount: item.helpfulCount ?? 0,
  }));
}
```

- [ ] **Step 4: Testi tekrar çalıştır, gerekirse alan eşlemesini fixture'a göre düzelt**

```bash
npm run test -- parser.test.ts
```

Beklenen: PASS. Eğer fixture'daki gerçek alan adları yukarıdaki `RawTrendyolReview`'dan farklıysa, `RawTrendyolReview` tipini ve `parseReviewResponse` içindeki eşlemeleri `docs/trendyol-endpoint-notes.md`'deki gerçek şemaya göre güncelleyin, test geçene kadar tekrarlayın.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scraper/parser.ts src/lib/scraper/parser.test.ts
git commit -m "feat: Trendyol yorum yanıtını normalize eden parser"
```

---

## Task 5: Scraper HTTP İstemcisi (Playwright ile — Nezaket Kuralları ile)

**REVİZE EDİLDİ (2026-09-08):** Orijinal tasarım (sade Node `fetch`) gerçek siteye karşı doğrulanınca Cloudflare'in Node'un TLS parmak izini engellediği ortaya çıktı (bkz. plan başındaki "Task 5 revizyon notu" ve `.superpowers/sdd/2026-09-08-trendyol-yorum-sistemi/task-5-report.md`). Bu görev artık Playwright (headless Chromium) ile gerçek bir tarayıcı network stack'i üzerinden istek atar. Pagination-durdurma mantığı da gerçek keşfe göre güncellendi: `result.summary.totalPages` kullanılıyor (boş sayfa varsayımı yerine — gerçek veride son sayfa boş dönmüyor).

**Files:**
- Create: `src/lib/scraper/trendyolClient.ts`
- Test: `src/lib/scraper/trendyolClient.test.ts`

**Interfaces:**
- Consumes: `docs/trendyol-endpoint-notes.md`'deki gerçek URL şablonu (Task 3), `parseReviewResponse`/`ParsedReview` (Task 4)
- Produces:
  - `fetchAllReviews(trendyolProductId: string): Promise<ParsedReview[]>` — Playwright ile gerçek browser üzerinden tüm sayfaları gezip birleştirilmiş yorum listesi döner. Task 6 (persist) bu fonksiyonu çağırır.
  - `fetchAllReviewsWithFetcher(trendyolProductId: string, fetchPage: PageFetcher): Promise<ParsedReview[]>` — Playwright'tan bağımsız, test edilebilir çekirdek mantık (retry/backoff/pagination). `PageFetcher = (url: string) => Promise<{ status: number; body: string }>`. Testler gerçek Playwright yerine bunu sahte bir `fetchPage` ile çağırır.

- [ ] **Step 1: Playwright'ı kur**

```bash
npm install playwright
npx playwright install chromium
```

- [ ] **Step 2: Başarısız testi yaz — `src/lib/scraper/trendyolClient.test.ts`**

```typescript
import { describe, it, expect, vi } from "vitest";
import { fetchAllReviewsWithFetcher } from "./trendyolClient";

describe("fetchAllReviewsWithFetcher", () => {
  it("paginates using result.summary.totalPages, then stops (real last page is not empty)", async () => {
    const page0 = {
      isSuccess: true,
      result: {
        summary: { totalPages: 2 },
        reviews: [
          { id: 1, rate: 5, comment: "Harika", userFullName: "A", likesCount: 0, createdAt: 1700000000000, mediaFiles: [] },
        ],
      },
    };
    const page1 = {
      isSuccess: true,
      result: {
        summary: { totalPages: 2 },
        reviews: [
          { id: 2, rate: 4, comment: "İyi", userFullName: "B", likesCount: 1, createdAt: 1700000100000, mediaFiles: [] },
        ],
      },
    };

    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ status: 200, body: JSON.stringify(page0) })
      .mockResolvedValueOnce({ status: 200, body: JSON.stringify(page1) });

    const reviews = await fetchAllReviewsWithFetcher("1071760667", fetchPage);

    expect(reviews).toHaveLength(2);
    expect(reviews[0].trendyolReviewId).toBe("1");
    expect(reviews[1].trendyolReviewId).toBe("2");
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("retries with backoff on 429, then succeeds", async () => {
    const okPage = {
      isSuccess: true,
      result: {
        summary: { totalPages: 1 },
        reviews: [
          { id: 2, rate: 4, comment: "İyi", userFullName: "B", likesCount: 0, createdAt: 1700000000000, mediaFiles: [] },
        ],
      },
    };

    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ status: 429, body: "rate limited" })
      .mockResolvedValueOnce({ status: 200, body: JSON.stringify(okPage) });

    const reviews = await fetchAllReviewsWithFetcher("1071760667", fetchPage);

    expect(reviews).toHaveLength(1);
    expect(reviews[0].trendyolReviewId).toBe("2");
  }, 10000);

  it("falls back to stopping on an empty page if totalPages is ever missing", async () => {
    const pageNoSummary = {
      isSuccess: true,
      result: { reviews: [] },
    };

    const fetchPage = vi.fn().mockResolvedValueOnce({ status: 200, body: JSON.stringify(pageNoSummary) });

    const reviews = await fetchAllReviewsWithFetcher("1071760667", fetchPage);

    expect(reviews).toHaveLength(0);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: Testi çalıştır, başarısız olduğunu doğrula**

```bash
npm run test -- trendyolClient.test.ts
```

Beklenen: FAIL — modül/`fetchAllReviewsWithFetcher` bulunamadı.

- [ ] **Step 4: `src/lib/scraper/trendyolClient.ts` implementasyonu**

```typescript
import { chromium } from "playwright";
import { parseReviewResponse, type ParsedReview } from "./parser";

const BACKOFF_MS = [5000, 15000, 45000];
const REQUEST_DELAY_RANGE_MS: [number, number] = [1000, 3000];
const WARMUP_URL = "https://www.trendyol.com/";

export type PageFetcher = (url: string) => Promise<{ status: number; body: string }>;

function randomDelay(): Promise<void> {
  const [min, max] = REQUEST_DELAY_RANGE_MS;
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildReviewUrl(trendyolProductId: string, page: number): string {
  return `https://apigw.trendyol.com/discovery-storefront-trproductgw-service/api/review-read/product-reviews/detailed?contentId=${trendyolProductId}&page=${page}&pageSize=20&order=DESC&orderBy=Score&channelId=1`;
}

async function fetchWithRetry(
  fetchPage: PageFetcher,
  url: string,
  attempt = 0
): Promise<unknown> {
  const { status, body } = await fetchPage(url);

  if (status === 429 || status === 403) {
    if (attempt >= BACKOFF_MS.length) {
      throw new Error(`Rate limited after ${BACKOFF_MS.length} retries: ${url}`);
    }
    await new Promise((resolve) => setTimeout(resolve, BACKOFF_MS[attempt]));
    return fetchWithRetry(fetchPage, url, attempt + 1);
  }

  if (status < 200 || status >= 300) {
    throw new Error(`Unexpected status ${status} for ${url}`);
  }

  return JSON.parse(body);
}

export async function fetchAllReviewsWithFetcher(
  trendyolProductId: string,
  fetchPage: PageFetcher
): Promise<ParsedReview[]> {
  const allReviews: ParsedReview[] = [];
  let page = 0;
  let totalPages: number | undefined;

  while (true) {
    const url = buildReviewUrl(trendyolProductId, page);
    const raw = (await fetchWithRetry(fetchPage, url)) as {
      result?: { summary?: { totalPages?: number } };
    };
    const pageReviews = parseReviewResponse(raw);
    allReviews.push(...pageReviews);

    totalPages = raw.result?.summary?.totalPages ?? totalPages;
    page += 1;

    const reachedTotalPages = totalPages !== undefined && page >= totalPages;
    if (pageReviews.length === 0 || reachedTotalPages) {
      break;
    }

    await randomDelay();
  }

  return allReviews;
}

export async function fetchAllReviews(trendyolProductId: string): Promise<ParsedReview[]> {
  // headless: false ZORUNLU — Cloudflare headless Chromium'u ana sayfa ısınma isteğinde
  // dahi 403 ile engelliyor (bkz. plan başındaki Task 5 revizyon notu #2). Production'da
  // ekransız çalıştırmak için Xvfb (veya benzeri sanal ekran) gerekir.
  const browser = await chromium.launch({ headless: false });
  try {
    const context = await browser.newContext({
      locale: "tr-TR",
    });
    const page = await context.newPage();
    // Isınma ziyareti: gerçek tarayıcı network stack'i üzerinden storefront/ülke çerezlerini alır.
    await page.goto(WARMUP_URL, { waitUntil: "domcontentloaded" });

    const fetchPage: PageFetcher = (url) =>
      page.evaluate(async (targetUrl) => {
        // credentials: 'include' ZORUNLU — apigw.trendyol.com, www.trendyol.com'dan farklı
        // bir origin; bu olmadan storefront/ülke çerezleri çapraz-origin istekte gönderilmez
        // ve API "Required country information is wrong or missing" hatası döner.
        const res = await fetch(targetUrl, { credentials: "include" });
        const body = await res.text();
        return { status: res.status, body };
      }, url);

    return await fetchAllReviewsWithFetcher(trendyolProductId, fetchPage);
  } finally {
    await browser.close();
  }
}
```

- [ ] **Step 5: Testi tekrar çalıştır**

```bash
npm run test -- trendyolClient.test.ts
```

Beklenen: PASS (3/3) — bu testler gerçek Playwright/tarayıcı başlatmaz, sadece `fetchAllReviewsWithFetcher`'ı sahte bir `fetchPage` ile çağırır.

- [ ] **Step 6: Tek seferlik manuel doğrulama — gerçek `fetchAllReviews` gerçek siteye karşı çalışıyor mu**

Bu adım otomatik teste dönüştürülmez (gerçek siteye karşı otomatik test çalıştırmak nezaket kurallarına aykırı olur), ama implementasyonun gerçekten işe yaradığını bir kez elle doğrulayın:

```bash
npx tsx -e "
import('./src/lib/scraper/trendyolClient').then(async (m) => {
  const reviews = await m.fetchAllReviews('1071760667');
  console.log('Toplam yorum:', reviews.length);
  console.log('İlk yorum:', reviews[0]);
});
"
```

Beklenen: Cloudflare/ülke hatası olmadan gerçek yorumlar dönmeli (bu ürün için toplam 30 yorum bekleniyor, bkz. Task 3 notları). Sonucu (yorum sayısı, örnek bir yorum) raporunuza ekleyin.

- [ ] **Step 7: Commit**

```bash
git add src/lib/scraper/trendyolClient.ts src/lib/scraper/trendyolClient.test.ts package.json package-lock.json
git commit -m "feat: Playwright tabanlı Trendyol HTTP istemcisi (sayfalama + backoff + oturum ısınması)"
```

---

## Task 6: Scraper Persistence (Dedup + ScrapeLog)

**Files:**
- Create: `src/lib/scraper/persist.ts`
- Test: `src/lib/scraper/persist.test.ts`

**Interfaces:**
- Consumes: `prisma` (Task 2), `fetchAllReviews` (Task 5), `ParsedReview` tipi (Task 4)
- Produces: `scrapeProduct(productId: string): Promise<{ status: "success" | "failed"; newReviews: number }>` — Task 7 (CLI) ve Task 15 (cron) bu fonksiyonu çağırır.

- [ ] **Step 1: Başarısız testi yaz — `src/lib/scraper/persist.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { scrapeProduct } from "./persist";
import * as client from "./trendyolClient";

describe("scrapeProduct", () => {
  beforeEach(async () => {
    await prisma.scrapeLog.deleteMany();
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("inserts new reviews, dedups on trendyolReviewId, writes a success ScrapeLog", async () => {
    const product = await prisma.product.create({
      data: { trendyolProductId: "p-1", trendyolUrl: "https://x", name: "Ürün 1" },
    });

    vi.spyOn(client, "fetchAllReviews").mockResolvedValue([
      {
        trendyolReviewId: "r-1",
        rating: 5,
        comment: "Süper",
        authorName: "A",
        hasPhoto: false,
        photoUrls: [],
        reviewDate: new Date("2026-01-01"),
        helpfulCount: 0,
      },
    ]);

    const result = await scrapeProduct(product.id);

    expect(result.status).toBe("success");
    expect(result.newReviews).toBe(1);

    const reviews = await prisma.review.findMany({ where: { productId: product.id } });
    expect(reviews).toHaveLength(1);

    // İkinci çalıştırma aynı yorumu tekrar eklemez
    const secondResult = await scrapeProduct(product.id);
    expect(secondResult.newReviews).toBe(0);
    const reviewsAfterSecond = await prisma.review.findMany({ where: { productId: product.id } });
    expect(reviewsAfterSecond).toHaveLength(1);

    const logs = await prisma.scrapeLog.findMany({ where: { productId: product.id } });
    expect(logs).toHaveLength(2);
    expect(logs[0].status).toBe("success");

    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(updatedProduct.lastScrapedAt).not.toBeNull();
  });

  it("writes a failed ScrapeLog when fetchAllReviews throws, without stopping the process", async () => {
    const product = await prisma.product.create({
      data: { trendyolProductId: "p-2", trendyolUrl: "https://x", name: "Ürün 2" },
    });

    vi.spyOn(client, "fetchAllReviews").mockRejectedValue(new Error("network error"));

    const result = await scrapeProduct(product.id);

    expect(result.status).toBe("failed");
    const logs = await prisma.scrapeLog.findMany({ where: { productId: product.id } });
    expect(logs[0].status).toBe("failed");
    expect(logs[0].errorMessage).toContain("network error");
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

```bash
docker-compose up -d db
npm run test -- persist.test.ts
```

Beklenen: FAIL — `persist.ts` modülü yok.

- [ ] **Step 3: `src/lib/scraper/persist.ts` implementasyonu**

```typescript
import { prisma } from "@/lib/db";
import { fetchAllReviews } from "./trendyolClient";

export async function scrapeProduct(
  productId: string
): Promise<{ status: "success" | "failed"; newReviews: number }> {
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  const startedAt = new Date();

  try {
    const reviews = await fetchAllReviews(product.trendyolProductId);

    // Tek toplu insert — döngü içinde tek tek createMany çağırmak yerine (N ürünlü
    // ürünlerde N ayrı DB round-trip'i anlamına gelir), tüm yorumlar tek seferde yazılır.
    const created = await prisma.review.createMany({
      data: reviews.map((review) => ({
        productId: product.id,
        trendyolReviewId: review.trendyolReviewId,
        rating: review.rating,
        comment: review.comment,
        authorName: review.authorName,
        hasPhoto: review.hasPhoto,
        photoUrls: review.photoUrls,
        reviewDate: review.reviewDate,
        helpfulCount: review.helpfulCount,
      })),
      skipDuplicates: true,
    });
    const newCount = created.count;

    await prisma.product.update({
      where: { id: product.id },
      data: { lastScrapedAt: new Date() },
    });

    await prisma.scrapeLog.create({
      data: {
        productId: product.id,
        startedAt,
        finishedAt: new Date(),
        status: "success",
        newReviews: newCount,
      },
    });

    return { status: "success", newReviews: newCount };
  } catch (error) {
    await prisma.scrapeLog.create({
      data: {
        productId: product.id,
        startedAt,
        finishedAt: new Date(),
        status: "failed",
        newReviews: 0,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });

    return { status: "failed", newReviews: 0 };
  }
}
```

- [ ] **Step 4: Testi tekrar çalıştır**

```bash
npm run test -- persist.test.ts
```

Beklenen: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scraper/persist.ts src/lib/scraper/persist.test.ts
git commit -m "feat: scraper persistence — dedup insert + ScrapeLog"
```

---

## Task 7: Manuel Scrape CLI (Faz 1 Tamamlanma Testi)

**Files:**
- Create: `scripts/scrape-once.ts`
- Modify: `package.json` (script ekle)

**Interfaces:**
- Consumes: `scrapeProduct` (Task 6), `prisma` (Task 2)
- Produces: `npm run scrape:once -- <trendyolProductId>` komutu — Faz 1'in manuel doğrulama aracı, sonraki görevlerde bağımlılık yok.

- [ ] **Step 1: `scripts/scrape-once.ts` yaz**

```typescript
import { prisma } from "../src/lib/db";
import { scrapeProduct } from "../src/lib/scraper/persist";

async function main() {
  const trendyolProductId = process.argv[2];
  if (!trendyolProductId) {
    console.error("Kullanım: npm run scrape:once -- <trendyolProductId>");
    process.exit(1);
  }

  const product = await prisma.product.upsert({
    where: { trendyolProductId },
    update: {},
    create: {
      trendyolProductId,
      trendyolUrl: `https://www.trendyol.com/p/${trendyolProductId}`,
      name: `Ürün ${trendyolProductId}`,
    },
  });

  const result = await scrapeProduct(product.id);
  console.log(`Sonuç: ${result.status}, yeni yorum sayısı: ${result.newReviews}`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 2: `package.json`'a script ekle**

```json
"scrape:once": "tsx scripts/scrape-once.ts"
```

`tsx` yoksa kur:

```bash
npm install --save-dev tsx
```

- [ ] **Step 3: Doğrulama — gerçek bir ürün ID'siyle çalıştır**

```bash
npm run scrape:once -- <gerçek-trendyol-product-id>
```

Beklenen: `Sonuç: success, yeni yorum sayısı: N` (N ≥ 0). Prisma Studio ile kontrol edilebilir:

```bash
npx prisma studio
```

- [ ] **Step 4: Commit**

```bash
git add scripts/scrape-once.ts package.json package-lock.json
git commit -m "feat: manuel scrape CLI aracı"
```

---

## Task 8: Yorum Filtreleme Mantığı

**Files:**
- Create: `src/lib/reviews/filters.ts`
- Test: `src/lib/reviews/filters.test.ts`

**Interfaces:**
- Consumes: yok (saf fonksiyon, Prisma tiplerine bağımlı)
- Produces: `parseReviewQuery(searchParams: URLSearchParams): ReviewQuery` ve `buildReviewWhere(productId: string, query: ReviewQuery): Prisma.ReviewWhereInput`, `buildReviewOrderBy(query: ReviewQuery): Prisma.ReviewOrderByWithRelationInput`. Task 9 (API route) bu üç fonksiyonu kullanır.

- [ ] **Step 1: Başarısız testi yaz — `src/lib/reviews/filters.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { parseReviewQuery, buildReviewWhere, buildReviewOrderBy } from "./filters";

describe("parseReviewQuery", () => {
  it("parses stars, date range, hasPhoto, q, sort, pagination with defaults", () => {
    const params = new URLSearchParams(
      "stars=4,5&dateFrom=2026-01-01&dateTo=2026-02-01&hasPhoto=true&q=kargo&sort=mostHelpful&page=2&pageSize=10"
    );
    const query = parseReviewQuery(params);

    expect(query.stars).toEqual([4, 5]);
    expect(query.dateFrom).toEqual(new Date("2026-01-01"));
    expect(query.dateTo).toEqual(new Date("2026-02-01"));
    expect(query.hasPhoto).toBe(true);
    expect(query.q).toBe("kargo");
    expect(query.sort).toBe("mostHelpful");
    expect(query.page).toBe(2);
    expect(query.pageSize).toBe(10);
  });

  it("applies defaults when params are missing", () => {
    const query = parseReviewQuery(new URLSearchParams(""));
    expect(query.stars).toBeUndefined();
    expect(query.sort).toBe("newest");
    expect(query.page).toBe(1);
    expect(query.pageSize).toBe(20);
  });

  it("caps pageSize at 100", () => {
    const query = parseReviewQuery(new URLSearchParams("pageSize=500"));
    expect(query.pageSize).toBe(100);
  });
});

describe("buildReviewWhere", () => {
  it("always restricts to approved and not-hidden reviews for a product", () => {
    const where = buildReviewWhere("prod-1", { sort: "newest", page: 1, pageSize: 20 });
    expect(where).toMatchObject({
      productId: "prod-1",
      isApproved: true,
      isHidden: false,
    });
  });

  it("adds stars, date range, hasPhoto, and text search filters when present", () => {
    const where = buildReviewWhere("prod-1", {
      stars: [4, 5],
      dateFrom: new Date("2026-01-01"),
      dateTo: new Date("2026-02-01"),
      hasPhoto: true,
      q: "kargo",
      sort: "newest",
      page: 1,
      pageSize: 20,
    });

    expect(where.rating).toEqual({ in: [4, 5] });
    expect(where.reviewDate).toEqual({ gte: new Date("2026-01-01"), lte: new Date("2026-02-01") });
    expect(where.hasPhoto).toBe(true);
    expect(where.comment).toEqual({ contains: "kargo", mode: "insensitive" });
  });
});

describe("buildReviewOrderBy", () => {
  it.each([
    ["newest", { reviewDate: "desc" }],
    ["oldest", { reviewDate: "asc" }],
    ["mostHelpful", { helpfulCount: "desc" }],
  ])("maps sort=%s correctly", (sort, expected) => {
    const orderBy = buildReviewOrderBy({ sort: sort as any, page: 1, pageSize: 20 });
    expect(orderBy).toEqual(expected);
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

```bash
npm run test -- filters.test.ts
```

Beklenen: FAIL.

- [ ] **Step 3: `src/lib/reviews/filters.ts` implementasyonu**

```typescript
import type { Prisma } from "@prisma/client";

export type ReviewSort = "newest" | "oldest" | "mostHelpful" | "longest";

export type ReviewQuery = {
  stars?: number[];
  dateFrom?: Date;
  dateTo?: Date;
  hasPhoto?: boolean;
  q?: string;
  sort: ReviewSort;
  page: number;
  pageSize: number;
};

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

export function parseReviewQuery(searchParams: URLSearchParams): ReviewQuery {
  const starsParam = searchParams.get("stars");
  const stars = starsParam
    ? starsParam.split(",").map((s) => Number(s.trim())).filter((n) => n >= 1 && n <= 5)
    : undefined;

  const dateFromParam = searchParams.get("dateFrom");
  const dateToParam = searchParams.get("dateTo");
  const hasPhotoParam = searchParams.get("hasPhoto");
  const q = searchParams.get("q") ?? undefined;
  const sort = (searchParams.get("sort") as ReviewSort | null) ?? "newest";

  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE)))
  );

  return {
    stars: stars && stars.length > 0 ? stars : undefined,
    dateFrom: dateFromParam ? new Date(dateFromParam) : undefined,
    dateTo: dateToParam ? new Date(dateToParam) : undefined,
    hasPhoto: hasPhotoParam === "true" ? true : hasPhotoParam === "false" ? false : undefined,
    q: q || undefined,
    sort,
    page,
    pageSize,
  };
}

export function buildReviewWhere(
  productId: string,
  query: ReviewQuery
): Prisma.ReviewWhereInput {
  const where: Prisma.ReviewWhereInput = {
    productId,
    isApproved: true,
    isHidden: false,
  };

  if (query.stars) {
    where.rating = { in: query.stars };
  }

  if (query.dateFrom || query.dateTo) {
    where.reviewDate = {
      ...(query.dateFrom ? { gte: query.dateFrom } : {}),
      ...(query.dateTo ? { lte: query.dateTo } : {}),
    };
  }

  if (query.hasPhoto !== undefined) {
    where.hasPhoto = query.hasPhoto;
  }

  if (query.q) {
    where.comment = { contains: query.q, mode: "insensitive" };
  }

  return where;
}

export function buildReviewOrderBy(
  query: ReviewQuery
): Prisma.ReviewOrderByWithRelationInput {
  switch (query.sort) {
    case "oldest":
      return { reviewDate: "asc" };
    case "mostHelpful":
      return { helpfulCount: "desc" };
    case "longest":
      return { comment: "desc" }; // uzunluk sıralaması API katmanında uygulanır, bkz. Task 9
    case "newest":
    default:
      return { reviewDate: "desc" };
  }
}
```

- [ ] **Step 4: Testi tekrar çalıştır**

```bash
npm run test -- filters.test.ts
```

Beklenen: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/reviews/filters.ts src/lib/reviews/filters.test.ts
git commit -m "feat: yorum filtreleme/sıralama query builder"
```

---

## Task 9: API Route — `GET /api/v1/products/:id/reviews`

**Files:**
- Create: `src/app/api/v1/products/[id]/reviews/route.ts`
- Test: `src/app/api/v1/products/[id]/reviews/route.test.ts`

**Interfaces:**
- Consumes: `prisma` (Task 2), `parseReviewQuery`/`buildReviewWhere`/`buildReviewOrderBy` (Task 8)
- Produces: HTTP `GET /api/v1/products/:id/reviews` → `{ data: Review[], pagination: { page, pageSize, total } }`. Task 10 (widget) bu endpoint'i tüketir.

- [ ] **Step 1: Başarısız testi yaz — `route.test.ts`**

```typescript
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { GET } from "./route";

function makeRequest(url: string) {
  return new Request(url);
}

describe("GET /api/v1/products/:id/reviews", () => {
  beforeEach(async () => {
    // ScrapeLog önce silinmeli — Product/Review FK'si üzerinden referans veriyor
    // (bkz. Task 6'nın kendi testi ve Task 9 fix round 1 — paylaşımlı dev DB'de
    // gerçek scrape verisi kalmışsa product.deleteMany() FK ihlaliyle patlar).
    await prisma.scrapeLog.deleteMany();
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns paginated, approved & non-hidden reviews filtered by stars", async () => {
    const product = await prisma.product.create({
      data: { trendyolProductId: "p-1", trendyolUrl: "https://x", name: "Ürün" },
    });

    await prisma.review.createMany({
      data: [
        { productId: product.id, trendyolReviewId: "r1", rating: 5, comment: "Süper", authorName: "A", reviewDate: new Date("2026-01-01") },
        { productId: product.id, trendyolReviewId: "r2", rating: 2, comment: "Kötü", authorName: "B", reviewDate: new Date("2026-01-02") },
        { productId: product.id, trendyolReviewId: "r3", rating: 5, comment: "Gizli", authorName: "C", reviewDate: new Date("2026-01-03"), isHidden: true },
      ],
    });

    const response = await GET(makeRequest(`http://localhost/api/v1/products/${product.id}/reviews?stars=5`), {
      params: Promise.resolve({ id: product.id }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].trendyolReviewId).toBe("r1");
    expect(body.pagination).toMatchObject({ page: 1, pageSize: 20, total: 1 });
  });

  it("returns 404 for an unknown product id", async () => {
    const response = await GET(makeRequest("http://localhost/api/v1/products/does-not-exist/reviews"), {
      params: Promise.resolve({ id: "does-not-exist" }),
    });
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("PRODUCT_NOT_FOUND");
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

```bash
npm run test -- reviews/route.test.ts
```

Beklenen: FAIL.

- [ ] **Step 3: `route.ts` implementasyonu**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseReviewQuery, buildReviewWhere, buildReviewOrderBy } from "@/lib/reviews/filters";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json(
      { error: { code: "PRODUCT_NOT_FOUND", message: "Ürün bulunamadı" } },
      { status: 404 }
    );
  }

  const url = new URL(request.url);
  const query = parseReviewQuery(url.searchParams);
  const where = buildReviewWhere(id, query);

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: buildReviewOrderBy(query),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.review.count({ where }),
  ]);

  const data =
    query.sort === "longest"
      ? [...reviews].sort((a, b) => b.comment.length - a.comment.length)
      : reviews;

  return NextResponse.json({
    data,
    pagination: { page: query.page, pageSize: query.pageSize, total },
  });
}
```

- [ ] **Step 4: Testi tekrar çalıştır**

```bash
npm run test -- reviews/route.test.ts
```

Beklenen: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/v1/products/[id]/reviews
git commit -m "feat: GET /api/v1/products/:id/reviews endpoint'i"
```

---

## Task 10: API Route — `GET /api/v1/products/:id/summary`

**Files:**
- Create: `src/app/api/v1/products/[id]/summary/route.ts`
- Test: `src/app/api/v1/products/[id]/summary/route.test.ts`

**Interfaces:**
- Consumes: `prisma` (Task 2)
- Produces: HTTP `GET /api/v1/products/:id/summary` → `{ averageRating: number, totalReviews: number, ratingCounts: { 1: number, ..., 5: number } }`. Task 10 widget bu endpoint'i özet kartı için kullanır.

- [ ] **Step 1: Başarısız testi yaz — `summary/route.test.ts`**

```typescript
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { GET } from "./route";

describe("GET /api/v1/products/:id/summary", () => {
  beforeEach(async () => {
    // ScrapeLog önce silinmeli — bkz. Task 9 fix round 1 notu.
    await prisma.scrapeLog.deleteMany();
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("computes average rating and per-star counts for approved, non-hidden reviews", async () => {
    const product = await prisma.product.create({
      data: { trendyolProductId: "p-1", trendyolUrl: "https://x", name: "Ürün" },
    });

    await prisma.review.createMany({
      data: [
        { productId: product.id, trendyolReviewId: "r1", rating: 5, comment: "a", authorName: "A", reviewDate: new Date() },
        { productId: product.id, trendyolReviewId: "r2", rating: 5, comment: "b", authorName: "B", reviewDate: new Date() },
        { productId: product.id, trendyolReviewId: "r3", rating: 1, comment: "c", authorName: "C", reviewDate: new Date() },
        { productId: product.id, trendyolReviewId: "r4", rating: 5, comment: "gizli", authorName: "D", reviewDate: new Date(), isHidden: true },
      ],
    });

    const response = await GET(new Request(`http://localhost/api/v1/products/${product.id}/summary`), {
      params: Promise.resolve({ id: product.id }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.totalReviews).toBe(3);
    expect(body.averageRating).toBeCloseTo((5 + 5 + 1) / 3, 2);
    expect(body.ratingCounts).toMatchObject({ "1": 1, "2": 0, "3": 0, "4": 0, "5": 2 });
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

```bash
npm run test -- summary/route.test.ts
```

Beklenen: FAIL.

- [ ] **Step 3: `route.ts` implementasyonu**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json(
      { error: { code: "PRODUCT_NOT_FOUND", message: "Ürün bulunamadı" } },
      { status: 404 }
    );
  }

  const baseWhere = { productId: id, isApproved: true, isHidden: false };

  const grouped = await prisma.review.groupBy({
    by: ["rating"],
    where: baseWhere,
    _count: { rating: true },
  });

  const ratingCounts: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  let totalReviews = 0;
  let ratingSum = 0;

  for (const group of grouped) {
    ratingCounts[String(group.rating)] = group._count.rating;
    totalReviews += group._count.rating;
    ratingSum += group.rating * group._count.rating;
  }

  return NextResponse.json({
    averageRating: totalReviews > 0 ? ratingSum / totalReviews : 0,
    totalReviews,
    ratingCounts,
  });
}
```

- [ ] **Step 4: Testi tekrar çalıştır**

```bash
npm run test -- summary/route.test.ts
```

Beklenen: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/v1/products/[id]/summary
git commit -m "feat: GET /api/v1/products/:id/summary endpoint'i"
```

---

## Task 11: Embeddable Widget

**Files:**
- Create: `src/widget/widget.ts`
- Create: `src/widget/render.ts`
- Test: `src/widget/render.test.ts`
- Create: `public/widget-demo.html` (manuel test sayfası)

**Interfaces:**
- Consumes: `GET /api/v1/products/:id/reviews`, `GET /api/v1/products/:id/summary` (Task 9, 10)
- Produces: `renderReviewWidget(container: HTMLElement, options: { apiBaseUrl: string; productId: string }): void` — `widget.ts` bunu `data-product-id` özniteliğinden okuyup otomatik çağırır.

- [ ] **Step 1: Başarısız testi yaz — `src/widget/render.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderReviewWidget } from "./render";

describe("renderReviewWidget", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("fetches summary and reviews, then renders average rating and review items", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/summary")) {
          return Promise.resolve(
            new Response(JSON.stringify({ averageRating: 4.5, totalReviews: 2, ratingCounts: { "1": 0, "2": 0, "3": 0, "4": 1, "5": 1 } }))
          );
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                { id: "1", rating: 5, comment: "Harika ürün", authorName: "A", hasPhoto: false, reviewDate: "2026-01-01" },
              ],
              pagination: { page: 1, pageSize: 20, total: 1 },
            })
          )
        );
      })
    );

    const container = document.createElement("div");
    document.body.appendChild(container);

    await renderReviewWidget(container, { apiBaseUrl: "http://localhost", productId: "prod-1" });

    expect(container.textContent).toContain("4.5");
    expect(container.textContent).toContain("Harika ürün");
  });

  it("escapes HTML in review author/comment to prevent XSS", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/summary")) {
          return Promise.resolve(
            new Response(JSON.stringify({ averageRating: 5, totalReviews: 1, ratingCounts: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 1 } }))
          );
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "1",
                  rating: 5,
                  comment: "<img src=x onerror=alert(1)>",
                  authorName: "<script>alert('x')</script>",
                  hasPhoto: false,
                  reviewDate: "2026-01-01",
                },
              ],
              pagination: { page: 1, pageSize: 20, total: 1 },
            })
          )
        );
      })
    );

    const container = document.createElement("div");
    document.body.appendChild(container);

    await renderReviewWidget(container, { apiBaseUrl: "http://localhost", productId: "prod-1" });

    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.innerHTML).toContain("&lt;script&gt;");
  });
});
```

- [ ] **Step 2: Test bağımlılığı ekle (jsdom) ve config güncelle**

```bash
npm install --save-dev jsdom
```

`vitest.config.ts` içine widget testleri için ayrı ortam tanımı ekle — `test.environment` alanını `"jsdom"` yapan bir workspace/override yerine basitçe dosya başına ortam belirtmek için `render.test.ts`'in en üstüne şu yorumu ekle:

```typescript
// @vitest-environment jsdom
```

- [ ] **Step 3: Testi çalıştır, başarısız olduğunu doğrula**

```bash
npm run test -- widget/render.test.ts
```

Beklenen: FAIL.

- [ ] **Step 4: `src/widget/render.ts` implementasyonu**

```typescript
type WidgetOptions = { apiBaseUrl: string; productId: string };

type Summary = { averageRating: number; totalReviews: number };
type ReviewItem = {
  id: string;
  rating: number;
  comment: string;
  authorName: string;
  hasPhoto: boolean;
  reviewDate: string;
};

// Yorum yazarı adı ve yorum metni gerçek müşterilerden geliyor ve güvenilmeyen
// veri olarak ele alınmalı — bu widget üçüncü taraf sitelere gömülecek, o yüzden
// innerHTML'e ham haliyle basmak XSS açığı oluşturur.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function renderReviewWidget(container: HTMLElement, options: WidgetOptions) {
  const { apiBaseUrl, productId } = options;

  container.innerHTML = `<div data-testid="loading">Yorumlar yükleniyor...</div>`;

  try {
    const [summaryRes, reviewsRes] = await Promise.all([
      fetch(`${apiBaseUrl}/api/v1/products/${productId}/summary`),
      fetch(`${apiBaseUrl}/api/v1/products/${productId}/reviews`),
    ]);

    const summary: Summary = await summaryRes.json();
    const reviewsBody: { data: ReviewItem[] } = await reviewsRes.json();

    container.innerHTML = `
      <div class="ty-widget">
        <div class="ty-widget__summary">Ortalama Puan: ${summary.averageRating.toFixed(1)} (${summary.totalReviews} yorum)</div>
        <ul class="ty-widget__list">
          ${reviewsBody.data
            .map(
              (r) => `
            <li class="ty-widget__item">
              <strong>${r.rating}★</strong> ${escapeHtml(r.authorName)}: ${escapeHtml(r.comment)}
            </li>`
            )
            .join("")}
        </ul>
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<div class="ty-widget__error">Yorumlar şu an yüklenemiyor.</div>`;
  }
}
```

- [ ] **Step 5: Testi tekrar çalıştır**

```bash
npm run test -- widget/render.test.ts
```

Beklenen: PASS.

- [ ] **Step 6: `src/widget/widget.ts` — otomatik başlatma giriş noktası**

```typescript
import { renderReviewWidget } from "./render";

function init() {
  const scriptTag = document.currentScript as HTMLScriptElement | null;
  const productId = scriptTag?.dataset.productId;
  const apiBaseUrl = scriptTag?.dataset.apiBaseUrl ?? window.location.origin;

  if (!productId) {
    console.error("[ty-widget] data-product-id özniteliği eksik");
    return;
  }

  const container = document.createElement("div");
  container.id = `ty-widget-${productId}`;
  scriptTag?.insertAdjacentElement("afterend", container);

  renderReviewWidget(container, { apiBaseUrl, productId });
}

init();
```

- [ ] **Step 7: Manuel test sayfası oluştur — `public/widget-demo.html`**

```html
<!DOCTYPE html>
<html lang="tr">
  <head><meta charset="UTF-8" /><title>Widget Demo</title></head>
  <body>
    <h1>Widget Demo</h1>
    <script src="/widget/widget.js" data-product-id="REPLACE_WITH_REAL_PRODUCT_ID"></script>
  </body>
</html>
```

- [ ] **Step 8: Doğrulama — dev server üzerinde tarayıcıda kontrol**

```bash
npm run dev
```

`http://localhost:3000/widget-demo.html` adresini açın (widget bundle build/serve konfigürasyonu Task 15 sonrası deployment aşamasında netleştirilecektir — bu adımda amaç `renderReviewWidget`'ın tarayıcıda gerçek API'ye karşı çalıştığını doğrulamaktır); `public/widget-demo.html` içindeki `REPLACE_WITH_REAL_PRODUCT_ID`'yi Task 7'de scrape edilen gerçek bir `Product.id` ile değiştirip yorumların listelendiğini gözle kontrol edin.

- [ ] **Step 9: Commit**

```bash
git add src/widget public/widget-demo.html vitest.config.ts package.json package-lock.json
git commit -m "feat: embeddable review widget (fetch + render)"
```

---

## Task 12: Admin Kimlik Doğrulama

**Files:**
- Create: `src/lib/auth/session.ts`
- Create: `src/app/admin/login/page.tsx`
- Create: `src/app/api/admin/login/route.ts`
- Create: `src/middleware.ts`
- Test: `src/lib/auth/session.test.ts`

**Interfaces:**
- Consumes: `ADMIN_PASSWORD`, `SESSION_SECRET` env değişkenleri (Task 1)
- Produces: `createSessionCookie(): string`, `verifySessionCookie(value: string): boolean` — Task 13/14/15 admin sayfaları `middleware.ts` üzerinden bu korumadan geçer.

- [ ] **Step 1: Başarısız testi yaz — `src/lib/auth/session.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { createSessionToken, verifySessionToken } from "./session";

describe("session token", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "test-secret-32-characters-long!!";
  });

  it("creates a token that verifies successfully", () => {
    const token = createSessionToken();
    expect(verifySessionToken(token)).toBe(true);
  });

  it("rejects a tampered token", () => {
    const token = createSessionToken();
    expect(verifySessionToken(token + "tampered")).toBe(false);
  });

  it("rejects garbage input", () => {
    expect(verifySessionToken("not-a-real-token")).toBe(false);
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

```bash
npm run test -- session.test.ts
```

Beklenen: FAIL.

- [ ] **Step 3: `src/lib/auth/session.ts` implementasyonu**

```typescript
import { createHmac, timingSafeEqual } from "crypto";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET tanımlı değil");
  return secret;
}

export function createSessionToken(): string {
  const payload = `admin:${Date.now()}`;
  const signature = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

// HEX_SHA256 kontrolü ZORUNLU (Task 12 implementasyonu sırasında bulundu) —
// Buffer.from(str, "hex") geçersiz/eksik hex karakterlerini sessizce keser,
// bu da kurcalanmış (tampered) bir token'ın yanlışlıkla geçerli sayılmasına yol açabilir.
const HEX_SHA256 = /^[0-9a-f]{64}$/;

export function verifySessionToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const [payload, signature] = decoded.split(".");
    if (!payload || !signature || !HEX_SHA256.test(signature)) return false;

    const expected = createHmac("sha256", getSecret()).update(payload).digest("hex");
    const expectedBuf = Buffer.from(expected, "hex");
    const actualBuf = Buffer.from(signature, "hex");

    if (expectedBuf.length !== actualBuf.length) return false;
    return timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Testi tekrar çalıştır**

```bash
npm run test -- session.test.ts
```

Beklenen: PASS.

- [ ] **Step 5: Login API route — `src/app/api/admin/login/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { createSessionToken } from "@/lib/auth/session";

export async function POST(request: Request) {
  const { password } = await request.json();

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: { code: "INVALID_CREDENTIALS", message: "Şifre hatalı" } },
      { status: 401 }
    );
  }

  const token = createSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set("ty_admin_session", token, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return response;
}
```

- [ ] **Step 6: Login sayfası — `src/app/admin/login/page.tsx`**

```typescript
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push("/admin/products");
    } else {
      setError("Şifre hatalı");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Admin Girişi</h1>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Şifre"
      />
      <button type="submit">Giriş Yap</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
```

- [ ] **Step 7: `src/middleware.ts` — `/admin/*` rotalarını koru**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("ty_admin_session")?.value;
  const isAuthenticated = Boolean(token && verifySessionToken(token));

  if (!isAuthenticated) {
    // /api/admin/* bir JSON API'dir — HTML sayfasına yönlendirmek yerine 401 döner.
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Giriş yapmanız gerekiyor" } },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

// runtime: "nodejs" ZORUNLU (Task 12 implementasyonu sırasında bulundu) — Next.js
// middleware varsayılan olarak Edge Runtime'da çalışır ve Edge Runtime Node'un
// `crypto` modülünü desteklemez; bu olmadan verifySessionToken her zaman başarısız
// olur ve geçerli oturumlar bile /admin/login'e geri yönlendirilir.
//
// matcher HEM /admin/:path* HEM /api/admin/:path* İÇERMELİ (Task 13 implementasyonu
// sırasında bulundu, gerçek bir güvenlik açığı) — sadece "/admin/:path*" yalnızca
// sayfaları korur, /api/admin/* altındaki yazma endpoint'leri (ürün ekle/çıkar,
// yorum gizle/göster) girişsiz herkese açık kalırdı.
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
  runtime: "nodejs",
};
```

- [ ] **Step 8: Doğrulama**

```bash
npm run dev
```

`http://localhost:3000/admin/products` — giriş yapmadan açılırsa `/admin/login`'e yönlendirmeli. `.env`'deki `ADMIN_PASSWORD` ile giriş yapınca `/admin/products`'a ulaşmalı (Task 13'te sayfa henüz yok olabilir, 404 kabul edilebilir — önemli olan yönlendirmenin çalışması).

- [ ] **Step 9: Commit**

```bash
git add src/lib/auth src/app/admin/login src/app/api/admin/login src/middleware.ts
git commit -m "feat: admin kimlik doğrulama (şifre + imzalı session cookie)"
```

---

## Task 13: Admin — Ürün Yönetimi

**Files:**
- Create: `src/app/api/admin/products/route.ts` (GET liste, POST ekle)
- Create: `src/app/api/admin/products/[id]/route.ts` (PATCH — `isTracked` güncelle)
- Create: `src/app/admin/products/page.tsx`
- Test: `src/app/api/admin/products/route.test.ts`

**Interfaces:**
- Consumes: `prisma` (Task 2), admin auth middleware (Task 12)
- Produces: `POST /api/admin/products` (body: `{ trendyolUrl: string }`) — ürün URL'sinden `trendyolProductId` çıkarıp kayıt oluşturur.

- [ ] **Step 1: Başarısız testi yaz — `route.test.ts`**

```typescript
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { GET, POST } from "./route";

describe("/api/admin/products", () => {
  beforeEach(async () => {
    // ScrapeLog/Review önce silinmeli — bkz. Task 9 fix round 1 notu.
    await prisma.scrapeLog.deleteMany();
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a product by parsing trendyolProductId from the URL", async () => {
    const request = new Request("http://localhost/api/admin/products", {
      method: "POST",
      body: JSON.stringify({
        trendyolUrl: "https://www.trendyol.com/marka/urun-adi-p-123456789",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.trendyolProductId).toBe("123456789");
    expect(body.isTracked).toBe(true);
  });

  it("lists all products", async () => {
    await prisma.product.create({
      data: { trendyolProductId: "1", trendyolUrl: "https://x", name: "Ürün 1" },
    });

    const response = await GET();
    const body = await response.json();

    expect(body.data).toHaveLength(1);
  });

  it("returns 400 for a URL without a parseable product id", async () => {
    const request = new Request("http://localhost/api/admin/products", {
      method: "POST",
      body: JSON.stringify({ trendyolUrl: "https://www.trendyol.com/not-a-product-url" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

```bash
npm run test -- admin/products/route.test.ts
```

Beklenen: FAIL.

- [ ] **Step 3: `src/app/api/admin/products/route.ts` implementasyonu**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function extractProductId(trendyolUrl: string): string | null {
  const match = trendyolUrl.match(/-p-(\d+)/);
  return match ? match[1] : null;
}

export async function GET() {
  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ data: products });
}

export async function POST(request: Request) {
  const { trendyolUrl } = await request.json();

  const trendyolProductId = trendyolUrl ? extractProductId(trendyolUrl) : null;
  if (!trendyolProductId) {
    return NextResponse.json(
      { error: { code: "INVALID_URL", message: "Ürün ID'si URL'den çıkarılamadı" } },
      { status: 400 }
    );
  }

  const product = await prisma.product.create({
    data: {
      trendyolProductId,
      trendyolUrl,
      name: `Ürün ${trendyolProductId}`,
    },
  });

  return NextResponse.json(product, { status: 201 });
}
```

- [ ] **Step 4: Testi tekrar çalıştır**

```bash
npm run test -- admin/products/route.test.ts
```

Beklenen: PASS.

- [ ] **Step 5: `src/app/api/admin/products/[id]/route.ts` — takipten çıkarma**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { isTracked } = await request.json();

  const product = await prisma.product.update({
    where: { id },
    data: { isTracked },
  });

  return NextResponse.json(product);
}
```

- [ ] **Step 6: Admin sayfası — `src/app/admin/products/page.tsx`**

```typescript
"use client";
import { useEffect, useState } from "react";

type Product = { id: string; name: string; trendyolUrl: string; isTracked: boolean; lastScrapedAt: string | null };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [newUrl, setNewUrl] = useState("");

  async function load() {
    const res = await fetch("/api/admin/products");
    const body = await res.json();
    setProducts(body.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trendyolUrl: newUrl }),
    });
    setNewUrl("");
    load();
  }

  async function toggleTracked(product: Product) {
    await fetch(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isTracked: !product.isTracked }),
    });
    load();
  }

  return (
    <div>
      <h1>Ürün Yönetimi</h1>
      <form onSubmit={addProduct}>
        <input
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="Trendyol ürün URL'si"
        />
        <button type="submit">Ekle</button>
      </form>
      <ul>
        {products.map((p) => (
          <li key={p.id}>
            {p.name} — {p.isTracked ? "takip ediliyor" : "durduruldu"} — son tarama:{" "}
            {p.lastScrapedAt ?? "hiç"}
            <button onClick={() => toggleTracked(p)}>
              {p.isTracked ? "Takibi Durdur" : "Takibi Başlat"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 7: Doğrulama**

```bash
npm run dev
```

`/admin/products` sayfasından gerçek bir Trendyol ürün URL'si ekleyip listede göründüğünü kontrol edin.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/admin/products src/app/admin/products
git commit -m "feat: admin ürün yönetimi (ekle, listele, takip durdur)"
```

---

## Task 14: Admin — Yorum Moderasyonu

**Files:**
- Create: `src/app/api/admin/reviews/[id]/route.ts` (PATCH — `isHidden` güncelle)
- Create: `src/app/admin/products/[id]/reviews/page.tsx`
- Test: `src/app/api/admin/reviews/route.test.ts`

**Interfaces:**
- Consumes: `prisma` (Task 2)
- Produces: `PATCH /api/admin/reviews/:id` (body: `{ isHidden: boolean }`)

- [ ] **Step 1: Başarısız testi yaz — `src/app/api/admin/reviews/route.test.ts`**

```typescript
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { PATCH } from "./[id]/route";

describe("PATCH /api/admin/reviews/:id", () => {
  beforeEach(async () => {
    // ScrapeLog önce silinmeli — bkz. Task 9 fix round 1 notu.
    await prisma.scrapeLog.deleteMany();
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("toggles isHidden on a review", async () => {
    const product = await prisma.product.create({
      data: { trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün" },
    });
    const review = await prisma.review.create({
      data: { productId: product.id, trendyolReviewId: "r1", rating: 5, comment: "a", authorName: "A", reviewDate: new Date() },
    });

    const request = new Request(`http://localhost/api/admin/reviews/${review.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isHidden: true }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: review.id }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.isHidden).toBe(true);
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

```bash
npm run test -- admin/reviews/route.test.ts
```

Beklenen: FAIL.

- [ ] **Step 3: `src/app/api/admin/reviews/[id]/route.ts` implementasyonu**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { isHidden } = await request.json();

  const review = await prisma.review.update({
    where: { id },
    data: { isHidden },
  });

  return NextResponse.json(review);
}
```

- [ ] **Step 4: Testi tekrar çalıştır**

```bash
npm run test -- admin/reviews/route.test.ts
```

Beklenen: PASS.

- [ ] **Step 5: Admin sayfası — `src/app/admin/products/[id]/reviews/page.tsx`**

```typescript
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Review = { id: string; rating: number; comment: string; authorName: string; isHidden: boolean };

export default function ProductReviewsModerationPage() {
  const params = useParams<{ id: string }>();
  const [reviews, setReviews] = useState<Review[]>([]);

  async function load() {
    const res = await fetch(`/api/v1/products/${params.id}/reviews?pageSize=100`);
    const body = await res.json();
    setReviews(body.data);
  }

  useEffect(() => {
    load();
  }, [params.id]);

  async function toggleHidden(review: Review) {
    await fetch(`/api/admin/reviews/${review.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isHidden: !review.isHidden }),
    });
    load();
  }

  return (
    <div>
      <h1>Yorum Moderasyonu</h1>
      <ul>
        {reviews.map((r) => (
          <li key={r.id}>
            {r.rating}★ {r.authorName}: {r.comment}
            <button onClick={() => toggleHidden(r)}>{r.isHidden ? "Göster" : "Gizle"}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

> Not: Bu sayfa `GET /api/v1/.../reviews` genel endpoint'ini kullanıyor, ki bu endpoint yalnızca `isHidden=false` yorumları döner — moderasyon ekranında gizlenmiş yorumların da görünmesi gerektiği için bu Task'ta bilinçli bir sınırlama olarak not düşülür ve admin'e özel bir liste endpoint'i (`/api/admin/products/:id/reviews` — filtre uygulamadan tüm yorumları döner) eklenmesi gerekir. Step 5.1 olarak bu düzeltme eklenmiştir.

- [ ] **Step 5.1: Admin'e özel filtresiz liste endpoint'i — `src/app/api/admin/products/[id]/reviews/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const reviews = await prisma.review.findMany({
    where: { productId: id },
    orderBy: { reviewDate: "desc" },
  });
  return NextResponse.json({ data: reviews });
}
```

`src/app/admin/products/[id]/reviews/page.tsx` içindeki `load()` fonksiyonunda fetch URL'ini `/api/admin/products/${params.id}/reviews` olarak güncelle (moderasyon sayfası artık gizli yorumları da görsün).

- [ ] **Step 6: Doğrulama**

```bash
npm run dev
```

Daha önce scrape edilmiş bir ürünün `/admin/products/<id>/reviews` sayfasını açın, bir yorumu gizleyin, `GET /api/v1/products/<id>/reviews` çağrısında artık görünmediğini doğrulayın.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/admin/reviews src/app/api/admin/products/[id]/reviews src/app/admin/products/[id]/reviews
git commit -m "feat: admin yorum moderasyonu (gizle/göster)"
```

---

## Task 15: Admin — Scraper İzleme & Cron Zamanlama

**Files:**
- Create: `src/app/api/admin/scrape-logs/route.ts`
- Create: `src/app/admin/scrape-logs/page.tsx`
- Create: `src/lib/scraper/scheduler.ts`
- Create: `scripts/run-scheduler.ts`
- Test: `src/lib/scraper/scheduler.test.ts`

**Interfaces:**
- Consumes: `scrapeProduct` (Task 6), `prisma` (Task 2)
- Produces: `runScheduledScrape(): Promise<void>` — tüm `isTracked=true` ürünleri sırayla, aralarında nezaket gecikmesiyle tarar. `scripts/run-scheduler.ts` bunu cron ile tetikler.

- [ ] **Step 1: Başarısız testi yaz — `src/lib/scraper/scheduler.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { runScheduledScrape } from "./scheduler";
import * as persist from "./persist";

describe("runScheduledScrape", () => {
  beforeEach(async () => {
    await prisma.scrapeLog.deleteMany();
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("scrapes every tracked product sequentially and skips untracked ones", async () => {
    const tracked = await prisma.product.create({
      data: { trendyolProductId: "t1", trendyolUrl: "https://x", name: "Takip Edilen", isTracked: true },
    });
    await prisma.product.create({
      data: { trendyolProductId: "t2", trendyolUrl: "https://x", name: "Takip Edilmeyen", isTracked: false },
    });

    const scrapeProductSpy = vi
      .spyOn(persist, "scrapeProduct")
      .mockResolvedValue({ status: "success", newReviews: 0 });

    await runScheduledScrape();

    expect(scrapeProductSpy).toHaveBeenCalledTimes(1);
    expect(scrapeProductSpy).toHaveBeenCalledWith(tracked.id);
  });

  it("continues to the next product when one scrape fails", async () => {
    const p1 = await prisma.product.create({
      data: { trendyolProductId: "t1", trendyolUrl: "https://x", name: "1", isTracked: true },
    });
    const p2 = await prisma.product.create({
      data: { trendyolProductId: "t2", trendyolUrl: "https://x", name: "2", isTracked: true },
    });

    const scrapeProductSpy = vi
      .spyOn(persist, "scrapeProduct")
      .mockImplementation(async (productId: string) => {
        if (productId === p1.id) throw new Error("boom");
        return { status: "success", newReviews: 0 };
      });

    await runScheduledScrape();

    expect(scrapeProductSpy).toHaveBeenCalledTimes(2);
    expect(scrapeProductSpy).toHaveBeenCalledWith(p2.id);
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

```bash
npm run test -- scheduler.test.ts
```

Beklenen: FAIL.

- [ ] **Step 3: `src/lib/scraper/scheduler.ts` implementasyonu**

```typescript
import { prisma } from "@/lib/db";
import { scrapeProduct } from "./persist";

function randomInterProductDelay(): Promise<void> {
  const ms = Math.floor(Math.random() * 2000) + 1000;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runScheduledScrape(): Promise<void> {
  const trackedProducts = await prisma.product.findMany({ where: { isTracked: true } });

  for (const product of trackedProducts) {
    try {
      await scrapeProduct(product.id);
    } catch (error) {
      console.error(`[scheduler] Ürün ${product.id} taraması başarısız:`, error);
    }
    await randomInterProductDelay();
  }
}
```

- [ ] **Step 4: Testi tekrar çalıştır**

```bash
npm run test -- scheduler.test.ts
```

Beklenen: PASS.

- [ ] **Step 5: Cron çalıştırıcı script — `scripts/run-scheduler.ts`**

```typescript
import cron from "node-cron";
import { runScheduledScrape } from "../src/lib/scraper/scheduler";

// Her 3 saatte bir çalışır (spec: "sık güncelleme", 2-4 saat aralığı)
cron.schedule("0 */3 * * *", async () => {
  console.log(`[scheduler] Zamanlı tarama başlıyor: ${new Date().toISOString()}`);
  await runScheduledScrape();
  console.log(`[scheduler] Zamanlı tarama bitti: ${new Date().toISOString()}`);
});

console.log("[scheduler] Cron zamanlayıcı başlatıldı (her 3 saatte bir).");
```

`node-cron` kur:

```bash
npm install node-cron
npm install --save-dev @types/node-cron
```

`package.json`'a script ekle:

```json
"scheduler:start": "tsx scripts/run-scheduler.ts"
```

- [ ] **Step 6: Admin izleme API'si — `src/app/api/admin/scrape-logs/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const logs = await prisma.scrapeLog.findMany({
    orderBy: { startedAt: "desc" },
    take: 100,
    include: { product: { select: { name: true } } },
  });
  return NextResponse.json({ data: logs });
}
```

- [ ] **Step 7: Admin izleme sayfası — `src/app/admin/scrape-logs/page.tsx`**

```typescript
"use client";
import { useEffect, useState } from "react";

type ScrapeLog = {
  id: string;
  status: string;
  newReviews: number;
  startedAt: string;
  finishedAt: string | null;
  errorMessage: string | null;
  product: { name: string };
};

export default function ScrapeLogsPage() {
  const [logs, setLogs] = useState<ScrapeLog[]>([]);

  useEffect(() => {
    fetch("/api/admin/scrape-logs")
      .then((res) => res.json())
      .then((body) => setLogs(body.data));
  }, []);

  return (
    <div>
      <h1>Scraper İzleme</h1>
      <table>
        <thead>
          <tr>
            <th>Ürün</th>
            <th>Durum</th>
            <th>Yeni Yorum</th>
            <th>Başlangıç</th>
            <th>Hata</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{log.product.name}</td>
              <td>{log.status}</td>
              <td>{log.newReviews}</td>
              <td>{new Date(log.startedAt).toLocaleString("tr-TR")}</td>
              <td>{log.errorMessage ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 8: Doğrulama — uçtan uca**

```bash
npm run dev
```

`/admin/scrape-logs` sayfasını açın; daha önceki `npm run scrape:once` çalıştırmalarından gelen log kayıtlarının listelendiğini doğrulayın. Ardından zamanlayıcıyı manuel tetikleyin:

```bash
npm run scheduler:start
```

Beklenen: konsolda "Zamanlı tarama başlıyor" mesajı, birkaç saniye içinde (test ortamında ürün azsa) "Zamanlı tarama bitti" mesajı; `Ctrl+C` ile durdurun.

- [ ] **Step 9: Commit**

```bash
git add src/lib/scraper/scheduler.ts src/lib/scraper/scheduler.test.ts scripts/run-scheduler.ts src/app/api/admin/scrape-logs src/app/admin/scrape-logs package.json package-lock.json
git commit -m "feat: cron zamanlama, scheduler ve admin scraper izleme paneli"
```

---

## Plan Tamamlandığında Ulaşılan Durum

Faz 1 (Task 1-7): Manuel tetiklenebilir, DB'ye yazan bir scraper.
Faz 2 (Task 8-10): Filtrelenebilir REST API.
Faz 3 (Task 11): Herhangi bir siteye gömülebilir widget.
Faz 4 (Task 12-14): Korumalı admin panel — ürün yönetimi + yorum moderasyonu.
Faz 5 (Task 15): Otomatik zamanlama + izleme.

Kapsam dışı bırakılanlar (spec bölüm 1'de belirtildiği gibi): diğer pazaryerleri, sahte yorum tespiti, otomatik e2e testler, silinen/düzenlenen yorum senkronizasyonu — bunlar ayrı spec'ler gerektirir.
