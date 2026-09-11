import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { GET } from "./route";

describe("GET /api/admin/products/:id/reviews", () => {
  beforeEach(async () => {
    await prisma.scrapeLog.deleteMany();
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("paginates reviews instead of returning the entire table at once", async () => {
    const product = await prisma.product.create({
      data: { trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün" },
    });
    await prisma.review.createMany({
      data: Array.from({ length: 75 }, (_, i) => ({
        productId: product.id,
        trendyolReviewId: `r${i}`,
        rating: 5,
        comment: `yorum ${i}`,
        authorName: "A",
        reviewDate: new Date(2026, 0, i + 1),
      })),
    });

    const request = new Request(`http://localhost/api/admin/products/${product.id}/reviews?page=1&pageSize=50`);
    const response = await GET(request, { params: Promise.resolve({ id: product.id }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(50);
    expect(body.pagination).toMatchObject({ page: 1, pageSize: 50, total: 75 });

    const page2Request = new Request(`http://localhost/api/admin/products/${product.id}/reviews?page=2&pageSize=50`);
    const page2Response = await GET(page2Request, { params: Promise.resolve({ id: product.id }) });
    const page2Body = await page2Response.json();
    expect(page2Body.data).toHaveLength(25);
  });

  it("defaults to page 1 / pageSize 50 when no query params are given", async () => {
    const product = await prisma.product.create({
      data: { trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün" },
    });
    await prisma.review.create({
      data: { productId: product.id, trendyolReviewId: "r1", rating: 5, comment: "a", authorName: "A", reviewDate: new Date() },
    });

    const request = new Request(`http://localhost/api/admin/products/${product.id}/reviews`);
    const response = await GET(request, { params: Promise.resolve({ id: product.id }) });
    const body = await response.json();

    expect(body.pagination).toMatchObject({ page: 1, pageSize: 50 });
  });

  it("filters by search text across comment and author name, case-insensitively", async () => {
    const product = await prisma.product.create({
      data: { trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün" },
    });
    await prisma.review.createMany({
      data: [
        { productId: product.id, trendyolReviewId: "r1", rating: 5, comment: "Kumaş çok KALİTELİ", authorName: "Ayşe", reviewDate: new Date() },
        { productId: product.id, trendyolReviewId: "r2", rating: 4, comment: "İdare eder", authorName: "Mehmet Kaliteli", reviewDate: new Date() },
        { productId: product.id, trendyolReviewId: "r3", rating: 2, comment: "Beğenmedim", authorName: "Zeynep", reviewDate: new Date() },
      ],
    });

    const request = new Request(`http://localhost/api/admin/products/${product.id}/reviews?search=kaliteli`);
    const response = await GET(request, { params: Promise.resolve({ id: product.id }) });
    const body = await response.json();

    expect(body.pagination.total).toBe(2);
    expect(body.data.map((r: { trendyolReviewId: string }) => r.trendyolReviewId).sort()).toEqual(["r1", "r2"]);
  });

  it("filters by exact rating", async () => {
    const product = await prisma.product.create({
      data: { trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün" },
    });
    await prisma.review.createMany({
      data: [
        { productId: product.id, trendyolReviewId: "r1", rating: 5, comment: "a", authorName: "A", reviewDate: new Date() },
        { productId: product.id, trendyolReviewId: "r2", rating: 3, comment: "b", authorName: "B", reviewDate: new Date() },
      ],
    });

    const request = new Request(`http://localhost/api/admin/products/${product.id}/reviews?rating=3`);
    const response = await GET(request, { params: Promise.resolve({ id: product.id }) });
    const body = await response.json();

    expect(body.data).toHaveLength(1);
    expect(body.data[0].trendyolReviewId).toBe("r2");
  });

  it("ignores an out-of-range rating value instead of erroring", async () => {
    const product = await prisma.product.create({
      data: { trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün" },
    });
    await prisma.review.create({
      data: { productId: product.id, trendyolReviewId: "r1", rating: 5, comment: "a", authorName: "A", reviewDate: new Date() },
    });

    const request = new Request(`http://localhost/api/admin/products/${product.id}/reviews?rating=99`);
    const response = await GET(request, { params: Promise.resolve({ id: product.id }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pagination.total).toBe(1);
  });
});
