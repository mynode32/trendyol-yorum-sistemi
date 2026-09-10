import { chromium } from "playwright";
import { parseReviewResponse, type ParsedReview } from "./parser";

const BACKOFF_MS = [5000, 15000, 45000];
const REQUEST_DELAY_RANGE_MS: [number, number] = [1000, 3000];
const WARMUP_URL = "https://www.trendyol.com/";
// totalPages hiç gelmezse (API zarfı değişmişse) sonsuz döngüye düşmemek için üst sınır.
const MAX_PAGES = 500;

export type PageFetcher = (url: string) => Promise<{ status: number; body: string }>;

// headless:false ZORUNLU (Cloudflare headless'ı engelliyor, bkz. fetchAllReviews) ama
// pencerenin ekranda görünüp kullanıcıyı rahatsız etmesine gerek yok — gerçek bir
// pencere olarak açılır (Cloudflare'in beklediği gibi) ama ekranın çok dışına
// konumlandırılır, böylece kimse görmez.
function launchHeadedBrowser() {
  return chromium.launch({ headless: false, args: ["--window-position=-32000,-32000"] });
}

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
    if (pageReviews.length === 0 || reachedTotalPages || page >= MAX_PAGES) {
      break;
    }

    await randomDelay();
  }

  return allReviews;
}

/** Bir mağaza sayfasından toplanan href'lerden benzersiz Trendyol ürün ID'lerini çıkarır. */
export function extractProductIdsFromHrefs(hrefs: string[]): string[] {
  const ids = hrefs
    .map((href) => href.match(/-p-(\d+)/)?.[1])
    .filter((id): id is string => Boolean(id));
  return [...new Set(ids)];
}

export type ProductInfo = { name: string | null; imageUrl: string | null };

/** Ürün sayfasının og:title/og:image meta etiketlerinden gerçek ad ve görseli çeker. */
export async function fetchProductInfo(trendyolUrl: string): Promise<ProductInfo> {
  const browser = await launchHeadedBrowser();
  try {
    const context = await browser.newContext({ locale: "tr-TR" });
    const page = await context.newPage();
    await page.goto(trendyolUrl, { waitUntil: "domcontentloaded" });
    // page.evaluate, geçirilen fonksiyonu string'e çevirip izole tarayıcı bağlamında
    // çalıştırır — içeride adlandırılmış bir yardımcı fonksiyon tanımlamak (esbuild'in
    // isim koruma sarmalayıcısı __name üzerinden) o bağlamda ReferenceError'a yol açar.
    // Bu yüzden burada ayrı bir yardımcı yerine iki satır doğrudan yazılıyor.
    return await page.evaluate(() => ({
      name: document.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? null,
      imageUrl: document.querySelector('meta[property="og:image"]')?.getAttribute("content") ?? null,
    }));
  } finally {
    await browser.close();
  }
}

const DISCOVERY_MAX_SCROLLS = 40;
const DISCOVERY_STABLE_ROUNDS = 3;

/**
 * Bir Trendyol mağaza sayfasını (örn. trendyol.com/enwood-x-b171291) sonuna kadar
 * kaydırarak sayfadaki tüm ürün linklerini toplar. Mağaza sayfaları infinite-scroll
 * ile yeni ürün yüklüyor; art arda birkaç kaydırmada yeni ürün gelmeyince durur.
 */
export async function discoverSellerProductIds(sellerUrl: string): Promise<string[]> {
  const browser = await launchHeadedBrowser();
  try {
    const context = await browser.newContext({ locale: "tr-TR" });
    const page = await context.newPage();
    await page.goto(sellerUrl, { waitUntil: "domcontentloaded" });

    let stableRounds = 0;
    let lastCount = 0;
    for (let i = 0; i < DISCOVERY_MAX_SCROLLS && stableRounds < DISCOVERY_STABLE_ROUNDS; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const currentCount: number = await page.evaluate(
        () => document.querySelectorAll('a[href*="-p-"]').length
      );
      stableRounds = currentCount === lastCount ? stableRounds + 1 : 0;
      lastCount = currentCount;
    }

    const hrefs: string[] = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href*="-p-"]')).map(
        (a) => a.getAttribute("href") ?? ""
      )
    );
    return extractProductIdsFromHrefs(hrefs);
  } finally {
    await browser.close();
  }
}

export async function fetchAllReviews(trendyolProductId: string): Promise<ParsedReview[]> {
  // headless: false ZORUNLU — Cloudflare headless Chromium'u ana sayfa ısınma
  // isteğinde dahi 403 ile engelliyor (otomasyon parmak izi; headed modda aynı
  // istek 200 dönüyor). Production'da ekransız bir sunucuda çalıştırmak için Xvfb
  // (veya benzeri sanal ekran) gerekir — bkz. README "Dağıtım notları".
  const browser = await launchHeadedBrowser();
  try {
    const context = await browser.newContext({
      locale: "tr-TR",
    });
    const page = await context.newPage();
    // Isınma ziyareti: gerçek tarayıcı network stack'i üzerinden storefront/ülke çerezlerini alır.
    await page.goto(WARMUP_URL, { waitUntil: "domcontentloaded" });

    const fetchPage: PageFetcher = (url) =>
      page.evaluate(async (targetUrl) => {
        const res = await fetch(targetUrl, { credentials: "include" });
        const body = await res.text();
        return { status: res.status, body };
      }, url);

    return await fetchAllReviewsWithFetcher(trendyolProductId, fetchPage);
  } finally {
    await browser.close();
  }
}
