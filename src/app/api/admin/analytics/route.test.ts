import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { createSessionToken } from "@/lib/auth/session";
import { GET } from "./route";

let accountId: string;
let otherAccountId: string;
let sessionCookie: string;

function authedRequest() {
  return new Request("http://localhost/api/admin/analytics", {
    headers: { cookie: `ty_admin_session=${sessionCookie}` },
  });
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

describe("GET /api/admin/analytics", () => {
  beforeEach(async () => {
    process.env.SESSION_SECRET = "test-secret-32-characters-long!!";

    await prisma.scrapeLog.deleteMany();
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
    await prisma.account.deleteMany();

    const account = await prisma.account.create({ data: { name: "test-account" } });
    accountId = account.id;
    const otherAccount = await prisma.account.create({ data: { name: "other-account" } });
    otherAccountId = otherAccount.id;
    const user = await prisma.user.create({
      data: { accountId, email: "owner@example.com", passwordHash: "irrelevant-for-these-tests" },
    });
    sessionCookie = createSessionToken(user.id);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 UNAUTHORIZED without a valid session", async () => {
    const response = await GET(new Request("http://localhost/api/admin/analytics"));
    expect(response.status).toBe(401);
  });

  it("computes totals, average rating, and rating distribution — excluding hidden reviews and other accounts", async () => {
    const product = await prisma.product.create({
      data: { accountId, trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün 1" },
    });
    const otherProduct = await prisma.product.create({
      data: { accountId: otherAccountId, trendyolProductId: "p2", trendyolUrl: "https://x", name: "Başka hesap" },
    });
    await prisma.review.createMany({
      data: [
        { productId: product.id, trendyolReviewId: "r1", rating: 5, comment: "a", authorName: "A", reviewDate: daysAgo(1) },
        { productId: product.id, trendyolReviewId: "r2", rating: 3, comment: "b", authorName: "B", reviewDate: daysAgo(1) },
        { productId: product.id, trendyolReviewId: "r3", rating: 1, comment: "gizli", authorName: "C", reviewDate: daysAgo(1), isHidden: true },
        { productId: otherProduct.id, trendyolReviewId: "r4", rating: 1, comment: "başka hesap", authorName: "D", reviewDate: daysAgo(1) },
      ],
    });

    const response = await GET(authedRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary.totalReviews).toBe(2);
    expect(body.summary.averageRating).toBeCloseTo(4, 5);
    expect(body.summary.ratingDistribution).toMatchObject({ "1": 0, "2": 0, "3": 1, "4": 0, "5": 1 });
  });

  it("returns a null average and all-zero distribution when there are no reviews", async () => {
    const response = await GET(authedRequest());
    const body = await response.json();

    expect(body.summary.totalReviews).toBe(0);
    expect(body.summary.averageRating).toBeNull();
    expect(body.summary.ratingDistribution).toEqual({ "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 });
  });

  it("counts new reviews in the last 7/30 days by createdAt", async () => {
    const product = await prisma.product.create({
      data: { accountId, trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün 1" },
    });
    await prisma.review.create({
      data: {
        productId: product.id,
        trendyolReviewId: "r-new",
        rating: 5,
        comment: "a",
        authorName: "A",
        reviewDate: daysAgo(1),
        createdAt: daysAgo(1),
      },
    });
    await prisma.review.create({
      data: {
        productId: product.id,
        trendyolReviewId: "r-old",
        rating: 5,
        comment: "b",
        authorName: "B",
        reviewDate: daysAgo(1),
        createdAt: daysAgo(45),
      },
    });

    const response = await GET(authedRequest());
    const body = await response.json();

    expect(body.summary.newReviewsLast7Days).toBe(1);
    expect(body.summary.newReviewsLast30Days).toBe(1);
  });

  it("computes the 30-day average rating change from reviewDate windows", async () => {
    const product = await prisma.product.create({
      data: { accountId, trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün 1" },
    });
    // Önceki 30 gün (31-60 gün önce): ortalama 3.
    await prisma.review.createMany({
      data: [
        { productId: product.id, trendyolReviewId: "r1", rating: 3, comment: "a", authorName: "A", reviewDate: daysAgo(40) },
        { productId: product.id, trendyolReviewId: "r2", rating: 3, comment: "b", authorName: "B", reviewDate: daysAgo(50) },
      ],
    });
    // Son 30 gün: ortalama 5.
    await prisma.review.createMany({
      data: [
        { productId: product.id, trendyolReviewId: "r3", rating: 5, comment: "c", authorName: "C", reviewDate: daysAgo(5) },
        { productId: product.id, trendyolReviewId: "r4", rating: 5, comment: "d", authorName: "D", reviewDate: daysAgo(10) },
      ],
    });

    const response = await GET(authedRequest());
    const body = await response.json();

    expect(body.summary.averageRatingChange30d).toBeCloseTo(2, 5);
  });

  it("ranks top products by review count, and top/bottom rated products with a minimum review threshold", async () => {
    const popular = await prisma.product.create({
      data: { accountId, trendyolProductId: "p1", trendyolUrl: "https://x", name: "Popüler Ürün" },
    });
    const quiet = await prisma.product.create({
      data: { accountId, trendyolProductId: "p2", trendyolUrl: "https://x", name: "Sessiz Ürün" },
    });
    const oneReviewWonder = await prisma.product.create({
      data: { accountId, trendyolProductId: "p3", trendyolUrl: "https://x", name: "Tek Yorumlu Ürün" },
    });

    await prisma.review.createMany({
      data: [
        { productId: popular.id, trendyolReviewId: "r1", rating: 5, comment: "a", authorName: "A", reviewDate: daysAgo(1) },
        { productId: popular.id, trendyolReviewId: "r2", rating: 4, comment: "b", authorName: "B", reviewDate: daysAgo(1) },
        { productId: popular.id, trendyolReviewId: "r3", rating: 4, comment: "c", authorName: "C", reviewDate: daysAgo(1) },
        { productId: quiet.id, trendyolReviewId: "r4", rating: 1, comment: "d", authorName: "D", reviewDate: daysAgo(1) },
        { productId: quiet.id, trendyolReviewId: "r5", rating: 1, comment: "e", authorName: "E", reviewDate: daysAgo(1) },
        { productId: quiet.id, trendyolReviewId: "r6", rating: 1, comment: "f", authorName: "F", reviewDate: daysAgo(1) },
        // Sadece 1 yorumu var — sıralamalara (MIN_REVIEWS_FOR_RANKING altında) girmemeli.
        { productId: oneReviewWonder.id, trendyolReviewId: "r7", rating: 5, comment: "g", authorName: "G", reviewDate: daysAgo(1) },
      ],
    });

    const response = await GET(authedRequest());
    const body = await response.json();

    expect(body.topProductsByReviewCount[0]).toMatchObject({ name: "Popüler Ürün", reviewCount: 3 });
    expect(body.topRatedProducts[0]).toMatchObject({ name: "Popüler Ürün" });
    expect(body.bottomRatedProducts[0]).toMatchObject({ name: "Sessiz Ürün" });
    expect(body.topRatedProducts.some((p: { name: string }) => p.name === "Tek Yorumlu Ürün")).toBe(false);
    expect(body.bottomRatedProducts.some((p: { name: string }) => p.name === "Tek Yorumlu Ürün")).toBe(false);
  });

  it("buckets review volume into weekly windows by reviewDate", async () => {
    const product = await prisma.product.create({
      data: { accountId, trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün 1" },
    });
    await prisma.review.createMany({
      data: [
        { productId: product.id, trendyolReviewId: "r1", rating: 5, comment: "a", authorName: "A", reviewDate: daysAgo(1) },
        { productId: product.id, trendyolReviewId: "r2", rating: 5, comment: "b", authorName: "B", reviewDate: daysAgo(2) },
        { productId: product.id, trendyolReviewId: "r3", rating: 5, comment: "c", authorName: "C", reviewDate: daysAgo(10) },
      ],
    });

    const response = await GET(authedRequest());
    const body = await response.json();

    expect(body.weeklyVolume).toHaveLength(8);
    const totalBucketed = body.weeklyVolume.reduce((sum: number, w: { count: number }) => sum + w.count, 0);
    expect(totalBucketed).toBe(3);
    // Son hafta (dizinin son elemanı) en az bu iki yeni yorumu içermeli.
    expect(body.weeklyVolume[body.weeklyVolume.length - 1].count).toBeGreaterThanOrEqual(2);
  });
});
