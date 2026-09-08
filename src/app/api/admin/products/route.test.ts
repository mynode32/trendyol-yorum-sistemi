import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { GET, POST } from "./route";

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

  it("returns 400 for a URL without a parseable product id", async () => {
    const request = new Request("http://localhost/api/admin/products", {
      method: "POST",
      body: JSON.stringify({ trendyolUrl: "https://www.trendyol.com/not-a-product-url" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
