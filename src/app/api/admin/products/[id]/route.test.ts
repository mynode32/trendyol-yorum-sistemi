import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { createSessionToken } from "@/lib/auth/session";
import { PATCH, DELETE } from "./route";

let accountId: string;
let otherAccountId: string;
let sessionCookie: string;

function authedRequest(url: string, init: RequestInit = {}) {
  return new Request(url, {
    ...init,
    headers: { ...init.headers, cookie: `ty_admin_session=${sessionCookie}`, origin: "http://localhost" },
  });
}

describe("PATCH /api/admin/products/:id", () => {
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
    const request = new Request("http://localhost/api/admin/products/does-not-matter", {
      method: "PATCH",
      body: JSON.stringify({ isTracked: false }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: "does-not-matter" }) });
    expect(response.status).toBe(401);
  });

  it("resyncs the displayed set immediately when maxDisplayedReviews shrinks", async () => {
    const product = await prisma.product.create({
      data: { accountId, trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün", maxDisplayedReviews: 5 },
    });
    await prisma.review.createMany({
      data: [
        { productId: product.id, trendyolReviewId: "r-new", rating: 5, comment: "a", authorName: "A", reviewDate: new Date("2026-01-02"), isDisplayed: true },
        { productId: product.id, trendyolReviewId: "r-old", rating: 5, comment: "b", authorName: "B", reviewDate: new Date("2026-01-01"), isDisplayed: true },
      ],
    });

    const request = authedRequest(`http://localhost/api/admin/products/${product.id}`, {
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
      data: { accountId, trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün" },
    });

    const request = authedRequest(`http://localhost/api/admin/products/${product.id}`, {
      method: "PATCH",
      body: JSON.stringify({ maxDisplayedReviews: 0 }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: product.id }) });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_BODY");
  });

  it("returns 404 instead of updating a product that belongs to another account", async () => {
    const otherProduct = await prisma.product.create({
      data: { accountId: otherAccountId, trendyolProductId: "p1", trendyolUrl: "https://x", name: "Başka hesabın ürünü" },
    });

    const request = authedRequest(`http://localhost/api/admin/products/${otherProduct.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isTracked: false }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: otherProduct.id }) });

    expect(response.status).toBe(404);
    const unchanged = await prisma.product.findUnique({ where: { id: otherProduct.id } });
    expect(unchanged?.isTracked).toBe(true);
  });

  it("returns 404 instead of deleting a product that belongs to another account", async () => {
    const otherProduct = await prisma.product.create({
      data: { accountId: otherAccountId, trendyolProductId: "p1", trendyolUrl: "https://x", name: "Başka hesabın ürünü" },
    });

    const request = authedRequest(`http://localhost/api/admin/products/${otherProduct.id}`, { method: "DELETE" });
    const response = await DELETE(request, { params: Promise.resolve({ id: otherProduct.id }) });

    expect(response.status).toBe(404);
    expect(await prisma.product.findUnique({ where: { id: otherProduct.id } })).not.toBeNull();
  });
});
