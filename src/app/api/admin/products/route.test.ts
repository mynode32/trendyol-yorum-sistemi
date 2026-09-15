import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { createSessionToken } from "@/lib/auth/session";
import { GET, POST } from "./route";
import { PATCH, DELETE } from "./[id]/route";

let accountId: string;
let otherAccountId: string;
let sessionCookie: string;

function authedRequest(url: string, init: RequestInit = {}) {
  return new Request(url, {
    ...init,
    headers: { ...init.headers, cookie: `ty_admin_session=${sessionCookie}`, origin: "http://localhost" },
  });
}

describe("/api/admin/products", () => {
  beforeEach(async () => {
    process.env.SESSION_SECRET = "test-secret-32-characters-long!!";

    // ScrapeLog/Review önce silinmeli — bkz. Task 9 fix round 1 notu.
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
    const response = await GET(new Request("http://localhost/api/admin/products"));
    expect(response.status).toBe(401);
  });

  it("creates a product by parsing trendyolProductId from the URL, scoped to the logged-in account", async () => {
    const request = authedRequest("http://localhost/api/admin/products", {
      method: "POST",
      body: JSON.stringify({
        trendyolUrl: "https://www.trendyol.com/marka/urun-adi-p-123456789",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.trendyolProductId).toBe("123456789");
    expect(body.isTracked).toBe(true);
    expect(body.accountId).toBe(accountId);
  });

  it("lists only the logged-in account's products", async () => {
    await prisma.product.create({
      data: { accountId, trendyolProductId: "1", trendyolUrl: "https://x", name: "Ürün 1" },
    });
    await prisma.product.create({
      data: { accountId: otherAccountId, trendyolProductId: "2", trendyolUrl: "https://x", name: "Başka hesabın ürünü" },
    });

    const response = await GET(authedRequest("http://localhost/api/admin/products"));
    const body = await response.json();

    expect(body.data).toHaveLength(1);
    expect(body.data[0].trendyolProductId).toBe("1");
  });

  it("includes displayedReviewCount, counting only isDisplayed reviews", async () => {
    const product = await prisma.product.create({
      data: { accountId, trendyolProductId: "1", trendyolUrl: "https://x", name: "Ürün 1" },
    });
    await prisma.review.create({
      data: {
        productId: product.id,
        trendyolReviewId: "r1",
        rating: 5,
        comment: "a",
        authorName: "A",
        reviewDate: new Date(),
        isDisplayed: true,
      },
    });
    await prisma.review.create({
      data: {
        productId: product.id,
        trendyolReviewId: "r2",
        rating: 5,
        comment: "b",
        authorName: "B",
        reviewDate: new Date(),
        isDisplayed: false,
      },
    });

    const response = await GET(authedRequest("http://localhost/api/admin/products"));
    const body = await response.json();

    expect(body.data[0].displayedReviewCount).toBe(1);
  });

  it("returns a summary with the account name, average rating (displayed reviews only), and new-reviews-last-7-days count", async () => {
    const product = await prisma.product.create({
      data: { accountId, trendyolProductId: "1", trendyolUrl: "https://x", name: "Ürün 1" },
    });
    await prisma.review.create({
      data: {
        productId: product.id,
        trendyolReviewId: "r1",
        rating: 4,
        comment: "a",
        authorName: "A",
        reviewDate: new Date(),
        isDisplayed: true,
      },
    });
    await prisma.review.create({
      data: {
        productId: product.id,
        trendyolReviewId: "r2",
        rating: 2,
        comment: "b",
        authorName: "B",
        reviewDate: new Date(),
        isDisplayed: true,
      },
    });
    // Vitrinde değil — ortalamaya dahil edilmemeli.
    await prisma.review.create({
      data: {
        productId: product.id,
        trendyolReviewId: "r3",
        rating: 1,
        comment: "c",
        authorName: "C",
        reviewDate: new Date(),
        isDisplayed: false,
      },
    });

    const response = await GET(authedRequest("http://localhost/api/admin/products"));
    const body = await response.json();

    expect(body.summary.accountName).toBe("test-account");
    expect(body.summary.averageRating).toBe(3);
    expect(body.summary.newReviewsLast7Days).toBe(3);
  });

  it("does not count another account's reviews toward the summary", async () => {
    const product = await prisma.product.create({
      data: { accountId, trendyolProductId: "1", trendyolUrl: "https://x", name: "Ürün 1" },
    });
    const otherProduct = await prisma.product.create({
      data: { accountId: otherAccountId, trendyolProductId: "2", trendyolUrl: "https://x", name: "Başka hesabın ürünü" },
    });
    await prisma.review.create({
      data: {
        productId: product.id,
        trendyolReviewId: "r1",
        rating: 5,
        comment: "a",
        authorName: "A",
        reviewDate: new Date(),
        isDisplayed: true,
      },
    });
    await prisma.review.create({
      data: {
        productId: otherProduct.id,
        trendyolReviewId: "r2",
        rating: 1,
        comment: "b",
        authorName: "B",
        reviewDate: new Date(),
        isDisplayed: true,
      },
    });

    const response = await GET(authedRequest("http://localhost/api/admin/products"));
    const body = await response.json();

    expect(body.summary.averageRating).toBe(5);
  });

  it("returns a null average rating when there are no displayed reviews yet", async () => {
    await prisma.product.create({
      data: { accountId, trendyolProductId: "1", trendyolUrl: "https://x", name: "Ürün 1" },
    });

    const response = await GET(authedRequest("http://localhost/api/admin/products"));
    const body = await response.json();

    expect(body.summary.averageRating).toBeNull();
    expect(body.summary.newReviewsLast7Days).toBe(0);
  });

  it("accepts an optional minRating and stores it on the product", async () => {
    const request = authedRequest("http://localhost/api/admin/products", {
      method: "POST",
      body: JSON.stringify({
        trendyolUrl: "https://www.trendyol.com/marka/urun-adi-p-987654321",
        minRating: 4,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.minRating).toBe(4);
  });

  it("returns 400 INVALID_BODY for a minRating outside 1-5", async () => {
    const request = authedRequest("http://localhost/api/admin/products", {
      method: "POST",
      body: JSON.stringify({
        trendyolUrl: "https://www.trendyol.com/marka/urun-adi-p-987654321",
        minRating: 6,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_BODY");
  });

  it("returns 400 INVALID_BODY instead of 500 for malformed JSON", async () => {
    const request = authedRequest("http://localhost/api/admin/products", {
      method: "POST",
      body: "{not valid json",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_BODY");
  });

  it("returns 400 for a URL without a parseable product id", async () => {
    const request = authedRequest("http://localhost/api/admin/products", {
      method: "POST",
      body: JSON.stringify({ trendyolUrl: "https://www.trendyol.com/not-a-product-url" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 INVALID_BODY instead of 500 when isTracked is not a boolean", async () => {
    const product = await prisma.product.create({
      data: { accountId, trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün" },
    });

    const request = authedRequest(`http://localhost/api/admin/products/${product.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isTracked: "evet" }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: product.id }) });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_BODY");
  });

  it("returns 409 CONFLICT instead of 500 when the trendyolProductId already exists", async () => {
    await prisma.product.create({
      data: { accountId, trendyolProductId: "123456789", trendyolUrl: "https://x", name: "Ürün" },
    });

    const request = authedRequest("http://localhost/api/admin/products", {
      method: "POST",
      body: JSON.stringify({
        trendyolUrl: "https://www.trendyol.com/marka/urun-adi-p-123456789",
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe("CONFLICT");
  });

  it("returns 400 for a trendyolUrl outside the trendyol.com domain", async () => {
    const request = authedRequest("http://localhost/api/admin/products", {
      method: "POST",
      body: JSON.stringify({ trendyolUrl: "https://evil.example.com/urun-p-123456789" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_URL");
  });

  it("updates a product's minRating, and can clear it back to null", async () => {
    const product = await prisma.product.create({
      data: { accountId, trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün" },
    });

    const request = authedRequest(`http://localhost/api/admin/products/${product.id}`, {
      method: "PATCH",
      body: JSON.stringify({ minRating: 3 }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: product.id }) });
    expect(response.status).toBe(200);
    expect((await response.json()).minRating).toBe(3);

    const clearRequest = authedRequest(`http://localhost/api/admin/products/${product.id}`, {
      method: "PATCH",
      body: JSON.stringify({ minRating: null }),
    });
    const clearResponse = await PATCH(clearRequest, { params: Promise.resolve({ id: product.id }) });
    expect(clearResponse.status).toBe(200);
    expect((await clearResponse.json()).minRating).toBeNull();
  });

  it("updates a product's storeId, and can clear it back to null", async () => {
    const product = await prisma.product.create({
      data: { accountId, trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün" },
    });

    const request = authedRequest(`http://localhost/api/admin/products/${product.id}`, {
      method: "PATCH",
      body: JSON.stringify({ storeId: "enwood" }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: product.id }) });
    expect(response.status).toBe(200);
    expect((await response.json()).storeId).toBe("enwood");

    const clearRequest = authedRequest(`http://localhost/api/admin/products/${product.id}`, {
      method: "PATCH",
      body: JSON.stringify({ storeId: null }),
    });
    const clearResponse = await PATCH(clearRequest, { params: Promise.resolve({ id: product.id }) });
    expect(clearResponse.status).toBe(200);
    expect((await clearResponse.json()).storeId).toBeNull();
  });

  it("updates a product's externalRef, and can clear it back to null", async () => {
    const product = await prisma.product.create({
      data: { accountId, trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün" },
    });

    const request = authedRequest(`http://localhost/api/admin/products/${product.id}`, {
      method: "PATCH",
      body: JSON.stringify({ externalRef: "SKU-42" }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: product.id }) });
    expect(response.status).toBe(200);
    expect((await response.json()).externalRef).toBe("SKU-42");

    const clearRequest = authedRequest(`http://localhost/api/admin/products/${product.id}`, {
      method: "PATCH",
      body: JSON.stringify({ externalRef: null }),
    });
    const clearResponse = await PATCH(clearRequest, { params: Promise.resolve({ id: product.id }) });
    expect(clearResponse.status).toBe(200);
    expect((await clearResponse.json()).externalRef).toBeNull();
  });

  it("updates a product's reviewGroupId, and can clear it back to null", async () => {
    const product = await prisma.product.create({
      data: { accountId, trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün" },
    });

    const request = authedRequest(`http://localhost/api/admin/products/${product.id}`, {
      method: "PATCH",
      body: JSON.stringify({ reviewGroupId: "capella-tv-unitesi" }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: product.id }) });
    expect(response.status).toBe(200);
    expect((await response.json()).reviewGroupId).toBe("capella-tv-unitesi");

    const clearRequest = authedRequest(`http://localhost/api/admin/products/${product.id}`, {
      method: "PATCH",
      body: JSON.stringify({ reviewGroupId: null }),
    });
    const clearResponse = await PATCH(clearRequest, { params: Promise.resolve({ id: product.id }) });
    expect(clearResponse.status).toBe(200);
    expect((await clearResponse.json()).reviewGroupId).toBeNull();
  });

  it("returns 409 CONFLICT instead of 500 when externalRef already belongs to another product", async () => {
    await prisma.product.create({
      data: { accountId, trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün 1", externalRef: "SKU-1" },
    });
    const product2 = await prisma.product.create({
      data: { accountId, trendyolProductId: "p2", trendyolUrl: "https://x", name: "Ürün 2" },
    });

    const request = authedRequest(`http://localhost/api/admin/products/${product2.id}`, {
      method: "PATCH",
      body: JSON.stringify({ externalRef: "SKU-1" }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: product2.id }) });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe("CONFLICT");
  });

  it("returns 404 instead of 500 when patching an unknown product id", async () => {
    const request = authedRequest("http://localhost/api/admin/products/does-not-exist", {
      method: "PATCH",
      body: JSON.stringify({ isTracked: false }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: "does-not-exist" }) });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("does not misreport an unrelated DB error as 404 NOT_FOUND", async () => {
    const product = await prisma.product.create({
      data: { accountId, trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün" },
    });
    const updateSpy = vi
      .spyOn(prisma.product, "update")
      .mockRejectedValueOnce(new Error("bağlantı koptu"));

    const request = authedRequest(`http://localhost/api/admin/products/${product.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isTracked: false }),
    });

    await expect(PATCH(request, { params: Promise.resolve({ id: product.id }) })).rejects.toThrow(
      "bağlantı koptu"
    );

    updateSpy.mockRestore();
  });

  it("deletes a product along with its reviews and scrape logs", async () => {
    const product = await prisma.product.create({
      data: { accountId, trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün" },
    });
    await prisma.review.create({
      data: { productId: product.id, trendyolReviewId: "r1", rating: 5, comment: "a", authorName: "A", reviewDate: new Date() },
    });
    await prisma.scrapeLog.create({ data: { productId: product.id, status: "success" } });

    const request = authedRequest(`http://localhost/api/admin/products/${product.id}`, { method: "DELETE" });
    const response = await DELETE(request, { params: Promise.resolve({ id: product.id }) });

    expect(response.status).toBe(200);
    expect(await prisma.product.findUnique({ where: { id: product.id } })).toBeNull();
    expect(await prisma.review.findMany({ where: { productId: product.id } })).toHaveLength(0);
  });

  it("returns 404 instead of 500 when deleting an unknown product id", async () => {
    const request = authedRequest("http://localhost/api/admin/products/does-not-exist", { method: "DELETE" });
    const response = await DELETE(request, { params: Promise.resolve({ id: "does-not-exist" }) });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
