import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { createSessionToken } from "@/lib/auth/session";
import { GET } from "./route";

let accountId: string;
let otherAccountId: string;
let sessionCookie: string;

function authedRequest() {
  return new Request("http://localhost/api/admin/products/x/analytics", {
    headers: { cookie: `ty_admin_session=${sessionCookie}` },
  });
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

describe("GET /api/admin/products/:id/analytics", () => {
  beforeEach(async () => {
    process.env.SESSION_SECRET = "test-secret-32-characters-long!!";

    await prisma.scrapeLog.deleteMany();
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
    await prisma.account.deleteMany();

    const account = await prisma.account.create({ data: { name: "test-account" } });
    accountId = account.id;
    const otherAccount = await prisma.account.create({ data: { name: "other-account" } });
    otherAccountId = otherAccount.id;
    const user = await prisma.user.create({
      data: { accountId, email: "owner@example.com", passwordHash: "irrelevant-for-these-tests" },
    });
    sessionCookie = createSessionToken(user.id);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 UNAUTHORIZED without a valid session", async () => {
    const response = await GET(new Request("http://localhost/api/admin/products/x/analytics"), {
      params: Promise.resolve({ id: "x" }),
    });
    expect(response.status).toBe(401);
  });

  it("returns 404 for a product belonging to another account", async () => {
    const otherProduct = await prisma.product.create({
      data: { accountId: otherAccountId, trendyolProductId: "p1", trendyolUrl: "https://x", name: "Başka hesap" },
    });

    const response = await GET(authedRequest(), { params: Promise.resolve({ id: otherProduct.id }) });
    expect(response.status).toBe(404);
  });

  it("computes totals, average rating, and distribution for the product — excluding hidden reviews and other products", async () => {
    const product = await prisma.product.create({
      data: { accountId, trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün 1" },
    });
    const otherProduct = await prisma.product.create({
      data: { accountId, trendyolProductId: "p2", trendyolUrl: "https://x", name: "Ürün 2" },
    });
    await prisma.review.createMany({
      data: [
        { productId: product.id, trendyolReviewId: "r1", rating: 5, comment: "a", authorName: "A", reviewDate: daysAgo(1) },
        { productId: product.id, trendyolReviewId: "r2", rating: 3, comment: "b", authorName: "B", reviewDate: daysAgo(1) },
        { productId: product.id, trendyolReviewId: "r3", rating: 1, comment: "gizli", authorName: "C", reviewDate: daysAgo(1), isHidden: true },
        { productId: otherProduct.id, trendyolReviewId: "r4", rating: 1, comment: "d", authorName: "D", reviewDate: daysAgo(1) },
      ],
    });

    const response = await GET(
      new Request(`http://localhost/api/admin/products/${product.id}/analytics`, {
        headers: { cookie: `ty_admin_session=${sessionCookie}` },
      }),
      { params: Promise.resolve({ id: product.id }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.totalReviews).toBe(2);
    expect(body.averageRating).toBeCloseTo(4, 5);
    expect(body.ratingDistribution).toMatchObject({ "1": 0, "2": 0, "3": 1, "4": 0, "5": 1 });
  });

  it("computes the 30-day average rating change from reviewDate windows", async () => {
    const product = await prisma.product.create({
      data: { accountId, trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün 1" },
    });
    await prisma.review.createMany({
      data: [
        { productId: product.id, trendyolReviewId: "r1", rating: 3, comment: "a", authorName: "A", reviewDate: daysAgo(45) },
        { productId: product.id, trendyolReviewId: "r2", rating: 5, comment: "b", authorName: "B", reviewDate: daysAgo(5) },
      ],
    });

    const response = await GET(
      new Request(`http://localhost/api/admin/products/${product.id}/analytics`, {
        headers: { cookie: `ty_admin_session=${sessionCookie}` },
      }),
      { params: Promise.resolve({ id: product.id }) }
    );
    const body = await response.json();

    expect(body.averageRatingChange30d).toBeCloseTo(2, 5);
  });
});
