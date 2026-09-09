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

  it("inserts new reviews, refreshes changed source fields, and preserves moderation", async () => {
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
    // sort=longest DB seviyesinde sıralanabilsin diye yorum uzunluğu kalıcı olarak saklanır.
    expect(reviews[0].commentLength).toBe("Süper".length);

    // İkinci çalıştırma aynı yorumu tekrar eklemez; ama kaynaktaki değişen alanları
    // günceller ve admin'in gizleme kararına dokunmaz.
    await prisma.review.update({ where: { trendyolReviewId: "r-1" }, data: { isHidden: true } });
    vi.spyOn(client, "fetchAllReviews").mockResolvedValueOnce([
      {
        trendyolReviewId: "r-1",
        rating: 4,
        comment: "Güncellenmiş yorum",
        authorName: "B",
        hasPhoto: true,
        photoUrls: ["https://example.test/photo.jpg"],
        reviewDate: new Date("2026-01-02"),
        helpfulCount: 7,
      },
    ]);
    const secondResult = await scrapeProduct(product.id);
    expect(secondResult.newReviews).toBe(0);
    const reviewsAfterSecond = await prisma.review.findMany({ where: { productId: product.id } });
    expect(reviewsAfterSecond).toHaveLength(1);
    expect(reviewsAfterSecond[0]).toMatchObject({
      rating: 4,
      comment: "Güncellenmiş yorum",
      commentLength: "Güncellenmiş yorum".length,
      authorName: "B",
      hasPhoto: true,
      helpfulCount: 7,
      isHidden: true,
    });

    const logs = await prisma.scrapeLog.findMany({ where: { productId: product.id } });
    expect(logs).toHaveLength(2);
    expect(logs[0].status).toBe("success");

    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(updatedProduct.lastScrapedAt).not.toBeNull();
  });

  it("skips reviews below the product's minRating threshold", async () => {
    const product = await prisma.product.create({
      data: { trendyolProductId: "p-3", trendyolUrl: "https://x", name: "Ürün 3", minRating: 4 },
    });

    vi.spyOn(client, "fetchAllReviews").mockResolvedValue([
      { trendyolReviewId: "r-a", rating: 5, comment: "Harika", authorName: "A", hasPhoto: false, photoUrls: [], reviewDate: new Date("2026-01-01"), helpfulCount: 0 },
      { trendyolReviewId: "r-b", rating: 3, comment: "Orta", authorName: "B", hasPhoto: false, photoUrls: [], reviewDate: new Date("2026-01-01"), helpfulCount: 0 },
      { trendyolReviewId: "r-c", rating: 4, comment: "İyi", authorName: "C", hasPhoto: false, photoUrls: [], reviewDate: new Date("2026-01-01"), helpfulCount: 0 },
    ]);

    const result = await scrapeProduct(product.id);

    expect(result.status).toBe("success");
    expect(result.newReviews).toBe(2);
    const stored = await prisma.review.findMany({ where: { productId: product.id }, orderBy: { rating: "asc" } });
    expect(stored.map((r) => r.rating)).toEqual([4, 5]);
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
