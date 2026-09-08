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
