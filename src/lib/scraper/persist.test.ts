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
