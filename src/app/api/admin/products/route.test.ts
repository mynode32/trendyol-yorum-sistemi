import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { GET, POST } from "./route";
import { PATCH, DELETE } from "./[id]/route";

describe("/api/admin/products", () => {
  beforeEach(async () => {
    // ScrapeLog/Review önce silinmeli — bkz. Task 9 fix round 1 notu.
    await prisma.scrapeLog.deleteMany();
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a product by parsing trendyolProductId from the URL", async () => {
    const request = new Request("http://localhost/api/admin/products", {
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
  });

  it("lists all products", async () => {
    await prisma.product.create({
      data: { trendyolProductId: "1", trendyolUrl: "https://x", name: "Ürün 1" },
    });

    const response = await GET();
    const body = await response.json();

    expect(body.data).toHaveLength(1);
  });

  it("accepts an optional minRating and stores it on the product", async () => {
    const request = new Request("http://localhost/api/admin/products", {
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
    const request = new Request("http://localhost/api/admin/products", {
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

  it("returns 400 for a URL without a parseable product id", async () => {
    const request = new Request("http://localhost/api/admin/products", {
      method: "POST",
      body: JSON.stringify({ trendyolUrl: "https://www.trendyol.com/not-a-product-url" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 INVALID_BODY instead of 500 when isTracked is not a boolean", async () => {
    const product = await prisma.product.create({
      data: { trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün" },
    });

    const request = new Request(`http://localhost/api/admin/products/${product.id}`, {
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
      data: { trendyolProductId: "123456789", trendyolUrl: "https://x", name: "Ürün" },
    });

    const request = new Request("http://localhost/api/admin/products", {
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
    const request = new Request("http://localhost/api/admin/products", {
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
      data: { trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün" },
    });

    const request = new Request(`http://localhost/api/admin/products/${product.id}`, {
      method: "PATCH",
      body: JSON.stringify({ minRating: 3 }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: product.id }) });
    expect(response.status).toBe(200);
    expect((await response.json()).minRating).toBe(3);

    const clearRequest = new Request(`http://localhost/api/admin/products/${product.id}`, {
      method: "PATCH",
      body: JSON.stringify({ minRating: null }),
    });
    const clearResponse = await PATCH(clearRequest, { params: Promise.resolve({ id: product.id }) });
    expect(clearResponse.status).toBe(200);
    expect((await clearResponse.json()).minRating).toBeNull();
  });

  it("returns 404 instead of 500 when patching an unknown product id", async () => {
    const request = new Request("http://localhost/api/admin/products/does-not-exist", {
      method: "PATCH",
      body: JSON.stringify({ isTracked: false }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: "does-not-exist" }) });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("deletes a product along with its reviews and scrape logs", async () => {
    const product = await prisma.product.create({
      data: { trendyolProductId: "p1", trendyolUrl: "https://x", name: "Ürün" },
    });
    await prisma.review.create({
      data: { productId: product.id, trendyolReviewId: "r1", rating: 5, comment: "a", authorName: "A", reviewDate: new Date() },
    });
    await prisma.scrapeLog.create({ data: { productId: product.id, status: "success" } });

    const request = new Request(`http://localhost/api/admin/products/${product.id}`, { method: "DELETE" });
    const response = await DELETE(request, { params: Promise.resolve({ id: product.id }) });

    expect(response.status).toBe(200);
    expect(await prisma.product.findUnique({ where: { id: product.id } })).toBeNull();
    expect(await prisma.review.findMany({ where: { productId: product.id } })).toHaveLength(0);
  });

  it("returns 404 instead of 500 when deleting an unknown product id", async () => {
    const request = new Request("http://localhost/api/admin/products/does-not-exist", { method: "DELETE" });
    const response = await DELETE(request, { params: Promise.resolve({ id: "does-not-exist" }) });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
