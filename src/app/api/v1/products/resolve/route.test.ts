import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { GET } from "./route";

function makeRequest(url: string) {
  return new Request(url);
}

describe("GET /api/v1/products/resolve", () => {
  beforeEach(async () => {
    await prisma.scrapeLog.deleteMany();
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("resolves a product's internal id from its externalRef", async () => {
    const product = await prisma.product.create({
      data: { trendyolProductId: "p-1", trendyolUrl: "https://x", name: "Ürün", externalRef: "SKU-123" },
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

  it("returns 400 when the ref query param is missing", async () => {
    const response = await GET(makeRequest("http://localhost/api/v1/products/resolve"));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_QUERY");
  });
});
