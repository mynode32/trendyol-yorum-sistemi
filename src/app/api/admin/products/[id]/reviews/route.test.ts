import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { createSessionToken } from "@/lib/auth/session";
import { GET } from "./route";

let accountId: string;
let otherAccountId: string;
let sessionCookie: string;

function authedRequest(url: string) {
  return new Request(url, { headers: { cookie: `ty_admin_session=${sessionCookie}` } });
}

describe("GET /api/admin/products/:id/reviews", () => {
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
    const response = await GET(
      new Request("http://localhost/api/admin/products/does-not-matter/reviews"),
      { params: Promise.resolve({ id: "does-not-matter" }) }
    );
    expect(response.status).toBe(401);
  });

  it("returns 404 for a product that belongs to another account", async () => {
    const otherProduct = await prisma.product.create({
      data: { accountId: otherAccountId, trendyolProductId: "p1", trendyolUrl: "https://x", name: "Başka hesabın ürünü" },
    });

    const request = authedRequest(`http://localhost/api/admin/products/${otherProduct.id}/reviews`);
    const response = await GET(request, { params: Promise.resolve({ id: otherProduct.id }) });

    expect(response.status).toBe(404);
  });

  it("paginates reviews instead of returning the entire table at once", async () => {
    const product = await prisma.product.create({
      data: { accountId, trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün" },
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

    const request = authedRequest(`http://localhost/api/admin/products/${product.id}/reviews?page=1&pageSize=50`);
    const response = await GET(request, { params: Promise.resolve({ id: product.id }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(50);
    expect(body.pagination).toMatchObject({ page: 1, pageSize: 50, total: 75 });

    const page2Request = authedRequest(`http://localhost/api/admin/products/${product.id}/reviews?page=2&pageSize=50`);
    const page2Response = await GET(page2Request, { params: Promise.resolve({ id: product.id }) });
    const page2Body = await page2Response.json();
    expect(page2Body.data).toHaveLength(25);
  });

  it("defaults to page 1 / pageSize 50 when no query params are given", async () => {
    const product = await prisma.product.create({
      data: { accountId, trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün" },
    });
    await prisma.review.create({
      data: { productId: product.id, trendyolReviewId: "r1", rating: 5, comment: "a", authorName: "A", reviewDate: new Date() },
    });

    const request = authedRequest(`http://localhost/api/admin/products/${product.id}/reviews`);
    const response = await GET(request, { params: Promise.resolve({ id: product.id }) });
    const body = await response.json();

    expect(body.pagination).toMatchObject({ page: 1, pageSize: 50 });
  });

  it("filters by search text across comment and author name, case-insensitively", async () => {
    const product = await prisma.product.create({
      data: { accountId, trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün" },
    });
    await prisma.review.createMany({
      data: [
        { productId: product.id, trendyolReviewId: "r1", rating: 5, comment: "Kumaş çok KALİTELİ", authorName: "Ayşe", reviewDate: new Date() },
        { productId: product.id, trendyolReviewId: "r2", rating: 4, comment: "İdare eder", authorName: "Mehmet Kaliteli", reviewDate: new Date() },
        { productId: product.id, trendyolReviewId: "r3", rating: 2, comment: "Beğenmedim", authorName: "Zeynep", reviewDate: new Date() },
      ],
    });

    const request = authedRequest(`http://localhost/api/admin/products/${product.id}/reviews?search=kaliteli`);
    const response = await GET(request, { params: Promise.resolve({ id: product.id }) });
    const body = await response.json();

    expect(body.pagination.total).toBe(2);
    expect(body.data.map((r: { trendyolReviewId: string }) => r.trendyolReviewId).sort()).toEqual(["r1", "r2"]);
  });

  it("filters by exact rating", async () => {
    const product = await prisma.product.create({
      data: { accountId, trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün" },
    });
    await prisma.review.createMany({
      data: [
        { productId: product.id, trendyolReviewId: "r1", rating: 5, comment: "a", authorName: "A", reviewDate: new Date() },
        { productId: product.id, trendyolReviewId: "r2", rating: 3, comment: "b", authorName: "B", reviewDate: new Date() },
      ],
    });

    const request = authedRequest(`http://localhost/api/admin/products/${product.id}/reviews?rating=3`);
    const response = await GET(request, { params: Promise.resolve({ id: product.id }) });
    const body = await response.json();

    expect(body.data).toHaveLength(1);
    expect(body.data[0].trendyolReviewId).toBe("r2");
  });

  it("ignores an out-of-range rating value instead of erroring", async () => {
    const product = await prisma.product.create({
      data: { accountId, trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün" },
    });
    await prisma.review.create({
      data: { productId: product.id, trendyolReviewId: "r1", rating: 5, comment: "a", authorName: "A", reviewDate: new Date() },
    });

    const request = authedRequest(`http://localhost/api/admin/products/${product.id}/reviews?rating=99`);
    const response = await GET(request, { params: Promise.resolve({ id: product.id }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pagination.total).toBe(1);
  });
});
