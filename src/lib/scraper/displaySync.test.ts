import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { syncDisplayedReviews } from "./displaySync";

describe("syncDisplayedReviews", () => {
  beforeEach(async () => {
    await prisma.scrapeLog.deleteMany();
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function createReview(overrides: {
    productId: string;
    trendyolReviewId: string;
    reviewDate: Date;
    isHidden?: boolean;
    isApproved?: boolean;
  }) {
    return prisma.review.create({
      data: {
        productId: overrides.productId,
        trendyolReviewId: overrides.trendyolReviewId,
        rating: 5,
        comment: "yorum",
        authorName: "A",
        reviewDate: overrides.reviewDate,
        isHidden: overrides.isHidden ?? false,
        isApproved: overrides.isApproved ?? true,
      },
    });
  }

  it("marks only the newest maxDisplayedReviews reviews as displayed", async () => {
    const product = await prisma.product.create({
      data: { trendyolProductId: "p-1", trendyolUrl: "https://x", name: "Ürün 1", maxDisplayedReviews: 2 },
    });

    await createReview({ productId: product.id, trendyolReviewId: "r-1", reviewDate: new Date("2026-01-01") });
    await createReview({ productId: product.id, trendyolReviewId: "r-2", reviewDate: new Date("2026-01-03") });
    await createReview({ productId: product.id, trendyolReviewId: "r-3", reviewDate: new Date("2026-01-02") });

    await syncDisplayedReviews(product.id);

    const reviews = await prisma.review.findMany({
      where: { productId: product.id },
      orderBy: { reviewDate: "desc" },
    });
    expect(reviews.map((r) => [r.trendyolReviewId, r.isDisplayed])).toEqual([
      ["r-2", true],
      ["r-3", true],
      ["r-1", false],
    ]);
  });

  it("excludes hidden and unapproved reviews from the displayed set", async () => {
    const product = await prisma.product.create({
      data: { trendyolProductId: "p-2", trendyolUrl: "https://x", name: "Ürün 2", maxDisplayedReviews: 2 },
    });

    await createReview({ productId: product.id, trendyolReviewId: "r-1", reviewDate: new Date("2026-01-03"), isHidden: true });
    await createReview({ productId: product.id, trendyolReviewId: "r-2", reviewDate: new Date("2026-01-02") });
    await createReview({ productId: product.id, trendyolReviewId: "r-3", reviewDate: new Date("2026-01-01") });

    await syncDisplayedReviews(product.id);

    const reviews = await prisma.review.findMany({
      where: { productId: product.id },
      orderBy: { reviewDate: "desc" },
    });
    expect(reviews.map((r) => [r.trendyolReviewId, r.isDisplayed])).toEqual([
      ["r-1", false],
      ["r-2", true],
      ["r-3", true],
    ]);
  });

  it("demotes a previously displayed review once a newer one takes its place", async () => {
    const product = await prisma.product.create({
      data: { trendyolProductId: "p-3", trendyolUrl: "https://x", name: "Ürün 3", maxDisplayedReviews: 1 },
    });

    await createReview({ productId: product.id, trendyolReviewId: "r-old", reviewDate: new Date("2026-01-01") });
    await syncDisplayedReviews(product.id);

    await createReview({ productId: product.id, trendyolReviewId: "r-new", reviewDate: new Date("2026-01-05") });
    await syncDisplayedReviews(product.id);

    const reviews = await prisma.review.findMany({
      where: { productId: product.id },
      orderBy: { reviewDate: "desc" },
    });
    expect(reviews.map((r) => [r.trendyolReviewId, r.isDisplayed])).toEqual([
      ["r-new", true],
      ["r-old", false],
    ]);
  });
});
