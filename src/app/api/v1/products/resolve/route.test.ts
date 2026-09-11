import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { GET } from "./route";

function makeRequest(url: string) {
  return new Request(url);
}

describe("GET /api/v1/products/resolve", () => {
  let accountId: string;

  beforeEach(async () => {
    await prisma.scrapeLog.deleteMany();
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
    await prisma.account.deleteMany();
    const account = await prisma.account.create({ data: { name: "test-account" } });
    accountId = account.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("resolves a product's internal id from its externalRef", async () => {
    const product = await prisma.product.create({
      data: { accountId, trendyolProductId: "p-1", trendyolUrl: "https://x", name: "Ürün", externalRef: "SKU-123" },
    });

    const response = await GET(makeRequest("http://localhost/api/v1/products/resolve?ref=SKU-123"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ id: product.id });
  });

  it("returns 404 when no product matches the given externalRef", async () => {
    const response = await GET(makeRequest("http://localhost/api/v1/products/resolve?ref=does-not-exist"));

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("PRODUCT_NOT_FOUND");
  });

  it("resolves when storeId is provided and matches the product's storeId", async () => {
    const product = await prisma.product.create({
      data: { accountId, trendyolProductId: "p-2", trendyolUrl: "https://x", name: "Ürün", externalRef: "SKU-456", storeId: "enwood" },
    });

    const response = await GET(
      makeRequest("http://localhost/api/v1/products/resolve?ref=SKU-456&storeId=enwood")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ id: product.id });
  });

  it("returns 404 when storeId is provided but does not match the product's storeId (cross-store leak prevention)", async () => {
    await prisma.product.create({
      data: { accountId, trendyolProductId: "p-3", trendyolUrl: "https://x", name: "Ürün", externalRef: "SKU-789", storeId: "enwood" },
    });

    const response = await GET(
      makeRequest("http://localhost/api/v1/products/resolve?ref=SKU-789&storeId=sedefira")
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("PRODUCT_NOT_FOUND");
  });

  it("returns 400 when the ref query param is missing", async () => {
    const response = await GET(makeRequest("http://localhost/api/v1/products/resolve"));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_QUERY");
  });
});
