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
        { productId: product.id, trendyolReviewId: "r1", rating: 5, comment: "a", authorName: "A", reviewDate: new Date(), isDisplayed: true },
        { productId: product.id, trendyolReviewId: "r2", rating: 5, comment: "b", authorName: "B", reviewDate: new Date(), isDisplayed: true },
        { productId: product.id, trendyolReviewId: "r3", rating: 1, comment: "c", authorName: "C", reviewDate: new Date(), isDisplayed: true },
        { productId: product.id, trendyolReviewId: "r4", rating: 5, comment: "gizli", authorName: "D", reviewDate: new Date(), isHidden: true, isDisplayed: true },
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

  it("pools ratings from sibling products sharing reviewGroupId + storeId", async () => {
    const a = await prisma.product.create({
      data: {
        trendyolProductId: "p-140",
        trendyolUrl: "https://x",
        name: "140cm",
        storeId: "enwood",
        reviewGroupId: "capella-tv-unitesi",
      },
    });
    const b = await prisma.product.create({
      data: {
        trendyolProductId: "p-160",
        trendyolUrl: "https://x",
        name: "160cm",
        storeId: "enwood",
        reviewGroupId: "capella-tv-unitesi",
      },
    });
    await prisma.review.create({
      data: { productId: a.id, trendyolReviewId: "ra", rating: 5, comment: "a", authorName: "A", reviewDate: new Date(), isDisplayed: true },
    });
    await prisma.review.create({
      data: { productId: b.id, trendyolReviewId: "rb", rating: 3, comment: "b", authorName: "B", reviewDate: new Date(), isDisplayed: true },
    });

    const response = await GET(new Request(`http://localhost/api/v1/products/${a.id}/summary`), {
      params: Promise.resolve({ id: a.id }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.totalReviews).toBe(2);
    expect(body.averageRating).toBeCloseTo((5 + 3) / 2, 2);
  });
});
