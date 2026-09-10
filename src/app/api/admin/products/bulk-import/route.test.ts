import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { POST } from "./route";
import * as client from "@/lib/scraper/trendyolClient";

describe("POST /api/admin/products/bulk-import", () => {
  beforeEach(async () => {
    await prisma.scrapeLog.deleteMany();
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("discovers seller products and creates only the ones not already tracked", async () => {
    await prisma.product.create({
      data: { trendyolProductId: "111", trendyolUrl: "https://x", name: "Zaten Ekli" },
    });
    vi.spyOn(client, "discoverSellerProductIds").mockResolvedValue(["111", "222", "333"]);

    const request = new Request("http://localhost/api/admin/products/bulk-import", {
      method: "POST",
      body: JSON.stringify({ sellerUrl: "https://www.trendyol.com/enwood-x-b171291" }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ discovered: 3, added: 2, skipped: 1 });

    const products = await prisma.product.findMany({ orderBy: { trendyolProductId: "asc" } });
    expect(products.map((p) => p.trendyolProductId)).toEqual(["111", "222", "333"]);
  });

  it("applies the given storeId and minRating to all newly created products", async () => {
    vi.spyOn(client, "discoverSellerProductIds").mockResolvedValue(["444"]);

    const request = new Request("http://localhost/api/admin/products/bulk-import", {
      method: "POST",
      body: JSON.stringify({
        sellerUrl: "https://www.trendyol.com/enwood-x-b171291",
        storeId: "enwood",
        minRating: 4,
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);

    const product = await prisma.product.findUniqueOrThrow({ where: { trendyolProductId: "444" } });
    expect(product.storeId).toBe("enwood");
    expect(product.minRating).toBe(4);
  });

  it("returns 400 INVALID_URL for a non-trendyol seller URL", async () => {
    const request = new Request("http://localhost/api/admin/products/bulk-import", {
      method: "POST",
      body: JSON.stringify({ sellerUrl: "https://evil.example.com/enwood" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_URL");
  });

  it("returns 502 SELLER_FETCH_FAILED when discovery throws, without a 500", async () => {
    vi.spyOn(client, "discoverSellerProductIds").mockRejectedValue(new Error("tarayıcı çöktü"));

    const request = new Request("http://localhost/api/admin/products/bulk-import", {
      method: "POST",
      body: JSON.stringify({ sellerUrl: "https://www.trendyol.com/enwood-x-b171291" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error.code).toBe("SELLER_FETCH_FAILED");
  });
});
