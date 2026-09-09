import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";

const { scrapeProductMock } = vi.hoisted(() => ({ scrapeProductMock: vi.fn() }));
vi.mock("@/lib/scraper/persist", () => ({ scrapeProduct: scrapeProductMock }));

import { POST } from "./route";

describe("POST /api/admin/products/:id/scrape", () => {
  beforeEach(async () => {
    await prisma.scrapeLog.deleteMany();
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
    scrapeProductMock.mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("runs a known product scrape and returns the result", async () => {
    const product = await prisma.product.create({
      data: { trendyolProductId: "p-1", trendyolUrl: "https://x", name: "Ürün" },
    });
    scrapeProductMock.mockResolvedValue({ status: "success", newReviews: 3 });

    const response = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: product.id }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "success", newReviews: 3 });
    expect(scrapeProductMock).toHaveBeenCalledWith(product.id);
  });

  it("returns a useful error when scraping fails or product is unknown", async () => {
    const product = await prisma.product.create({
      data: { trendyolProductId: "p-2", trendyolUrl: "https://x", name: "Ürün" },
    });
    scrapeProductMock.mockResolvedValue({ status: "failed", newReviews: 0 });

    const failed = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: product.id }),
    });
    const unknown = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: "unknown" }),
    });

    expect(failed.status).toBe(502);
    expect((await failed.json()).error.code).toBe("SCRAPE_FAILED");
    expect(unknown.status).toBe(404);
  });
});
