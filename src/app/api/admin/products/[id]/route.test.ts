import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { PATCH } from "./route";

describe("PATCH /api/admin/products/:id", () => {
  beforeEach(async () => {
    await prisma.scrapeLog.deleteMany();
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("resyncs the displayed set immediately when maxDisplayedReviews shrinks", async () => {
    const product = await prisma.product.create({
      data: { trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün", maxDisplayedReviews: 5 },
    });
    await prisma.review.createMany({
      data: [
        { productId: product.id, trendyolReviewId: "r-new", rating: 5, comment: "a", authorName: "A", reviewDate: new Date("2026-01-02"), isDisplayed: true },
        { productId: product.id, trendyolReviewId: "r-old", rating: 5, comment: "b", authorName: "B", reviewDate: new Date("2026-01-01"), isDisplayed: true },
      ],
    });

    const request = new Request(`http://localhost/api/admin/products/${product.id}`, {
      method: "PATCH",
      body: JSON.stringify({ maxDisplayedReviews: 1 }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: product.id }) });

    expect(response.status).toBe(200);
    const reviews = await prisma.review.findMany({ where: { productId: product.id } });
    const byId = new Map(reviews.map((r) => [r.trendyolReviewId, r]));
    expect(byId.get("r-new")?.isDisplayed).toBe(true);
    expect(byId.get("r-old")?.isDisplayed).toBe(false);
  });

  it("returns 400 INVALID_BODY when maxDisplayedReviews is out of range", async () => {
    const product = await prisma.product.create({
      data: { trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün" },
    });

    const request = new Request(`http://localhost/api/admin/products/${product.id}`, {
      method: "PATCH",
      body: JSON.stringify({ maxDisplayedReviews: 0 }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: product.id }) });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_BODY");
  });
});
