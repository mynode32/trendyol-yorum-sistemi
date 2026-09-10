import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { PATCH } from "./[id]/route";

describe("PATCH /api/admin/reviews/:id", () => {
  beforeEach(async () => {
    // ScrapeLog önce silinmeli — bkz. Task 9 fix round 1 notu.
    await prisma.scrapeLog.deleteMany();
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("toggles isHidden on a review", async () => {
    const product = await prisma.product.create({
      data: { trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün" },
    });
    const review = await prisma.review.create({
      data: { productId: product.id, trendyolReviewId: "r1", rating: 5, comment: "a", authorName: "A", reviewDate: new Date() },
    });

    const request = new Request(`http://localhost/api/admin/reviews/${review.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isHidden: true }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: review.id }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.isHidden).toBe(true);
  });

  it("promotes the next eligible review into the display cap when the shown one is hidden", async () => {
    const product = await prisma.product.create({
      data: { trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün", maxDisplayedReviews: 1 },
    });
    const shown = await prisma.review.create({
      data: { productId: product.id, trendyolReviewId: "r-shown", rating: 5, comment: "a", authorName: "A", reviewDate: new Date("2026-01-02"), isDisplayed: true },
    });
    await prisma.review.create({
      data: { productId: product.id, trendyolReviewId: "r-waiting", rating: 5, comment: "b", authorName: "B", reviewDate: new Date("2026-01-01"), isDisplayed: false },
    });

    const request = new Request(`http://localhost/api/admin/reviews/${shown.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isHidden: true }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: shown.id }) });
    expect(response.status).toBe(200);

    const reviews = await prisma.review.findMany({ where: { productId: product.id } });
    const byId = new Map(reviews.map((r) => [r.trendyolReviewId, r]));
    expect(byId.get("r-shown")?.isDisplayed).toBe(false);
    expect(byId.get("r-waiting")?.isDisplayed).toBe(true);
  });

  it("returns 400 INVALID_BODY instead of 500 when isHidden is not a boolean", async () => {
    const product = await prisma.product.create({
      data: { trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün" },
    });
    const review = await prisma.review.create({
      data: { productId: product.id, trendyolReviewId: "r1", rating: 5, comment: "a", authorName: "A", reviewDate: new Date() },
    });

    const request = new Request(`http://localhost/api/admin/reviews/${review.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isHidden: "evet" }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: review.id }) });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_BODY");
  });

  it("returns 400 INVALID_BODY instead of 500 for malformed JSON", async () => {
    const request = new Request("http://localhost/api/admin/reviews/does-not-matter", {
      method: "PATCH",
      body: "{not json",
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: "does-not-matter" }) });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_BODY");
  });

  it("returns 404 instead of 500 for an unknown review id", async () => {
    const request = new Request("http://localhost/api/admin/reviews/does-not-exist", {
      method: "PATCH",
      body: JSON.stringify({ isHidden: true }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: "does-not-exist" }) });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("does not misreport an unrelated DB error as 404 NOT_FOUND", async () => {
    const product = await prisma.product.create({
      data: { trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün" },
    });
    const review = await prisma.review.create({
      data: { productId: product.id, trendyolReviewId: "r1", rating: 5, comment: "a", authorName: "A", reviewDate: new Date() },
    });
    const updateSpy = vi
      .spyOn(prisma.review, "update")
      .mockRejectedValueOnce(new Error("bağlantı koptu"));

    const request = new Request(`http://localhost/api/admin/reviews/${review.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isHidden: true }),
    });

    await expect(PATCH(request, { params: Promise.resolve({ id: review.id }) })).rejects.toThrow(
      "bağlantı koptu"
    );

    updateSpy.mockRestore();
  });
});
