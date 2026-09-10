import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { GET } from "./route";

function makeRequest(url: string) {
  return new Request(url);
}

describe("GET /api/v1/products/:id/reviews", () => {
  beforeEach(async () => {
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
        { productId: product.id, trendyolReviewId: "r1", rating: 5, comment: "Süper", authorName: "A", reviewDate: new Date("2026-01-01"), isDisplayed: true },
        { productId: product.id, trendyolReviewId: "r2", rating: 2, comment: "Kötü", authorName: "B", reviewDate: new Date("2026-01-02"), isDisplayed: true },
        { productId: product.id, trendyolReviewId: "r3", rating: 5, comment: "Gizli", authorName: "C", reviewDate: new Date("2026-01-03"), isHidden: true, isDisplayed: true },
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

  it("sort=longest returns the globally longest reviews, not just the longest within a page", async () => {
    const product = await prisma.product.create({
      data: { trendyolProductId: "p-longest", trendyolUrl: "https://x", name: "Ürün" },
    });

    // Yorum uzunlukları alfabetik sıradan bağımsız olsun diye baş harfler kasıtlı
    // olarak karışık: alfabetik sıralama uzunluk sıralamasıyla aynı sonucu vermez.
    const seed = [
      { id: "r1", comment: "z".repeat(10) },
      { id: "r2", comment: "a".repeat(90) },
      { id: "r3", comment: "y".repeat(20) },
      { id: "r4", comment: "b".repeat(80) },
      { id: "r5", comment: "x".repeat(30) },
    ];

    await prisma.review.createMany({
      data: seed.map((s, i) => ({
        productId: product.id,
        trendyolReviewId: s.id,
        rating: 5,
        comment: s.comment,
        commentLength: s.comment.length,
        authorName: "A",
        reviewDate: new Date(2026, 0, i + 1),
        isDisplayed: true,
      })),
    });

    const response = await GET(
      makeRequest(`http://localhost/api/v1/products/${product.id}/reviews?sort=longest&pageSize=2`),
      { params: Promise.resolve({ id: product.id }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.map((r: { trendyolReviewId: string }) => r.trendyolReviewId)).toEqual([
      "r2",
      "r4",
    ]);
    expect(body.pagination).toMatchObject({ page: 1, pageSize: 2, total: 5 });

    // İkinci sayfa da global sıralamanın devamı olmalı.
    const page2 = await GET(
      makeRequest(
        `http://localhost/api/v1/products/${product.id}/reviews?sort=longest&pageSize=2&page=2`
      ),
      { params: Promise.resolve({ id: product.id }) }
    );
    const page2Body = await page2.json();
    expect(page2Body.data.map((r: { trendyolReviewId: string }) => r.trendyolReviewId)).toEqual([
      "r5",
      "r3",
    ]);
  });

  it("returns 400 with an INVALID_QUERY error for a malformed query param", async () => {
    const product = await prisma.product.create({
      data: { trendyolProductId: "p-bad-query", trendyolUrl: "https://x", name: "Ürün" },
    });

    const response = await GET(
      makeRequest(`http://localhost/api/v1/products/${product.id}/reviews?page=abc`),
      { params: Promise.resolve({ id: product.id }) }
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_QUERY");
    expect(body.error.message).toContain("page");
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
