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
  // headless: false ZORUNLU — Cloudflare headless Chromium'u ana sayfa ısınma
  // isteğinde dahi 403 ile engelliyor (otomasyon parmak izi; headed modda aynı
  // istek 200 dönüyor). Production'da ekransız bir sunucuda çalıştırmak için Xvfb
  // (veya benzeri sanal ekran) gerekir — bkz. README "Dağıtım notları".
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
        const res = await fetch(targetUrl, { credentials: "include" });
        const body = await res.text();
        return { status: res.status, body };
      }, url);

    return await fetchAllReviewsWithFetcher(trendyolProductId, fetchPage);
  } finally {
    await browser.close();
  }
}
