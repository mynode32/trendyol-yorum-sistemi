import { describe, it, expect, beforeEach, afterAll } from "vitest";
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
});
