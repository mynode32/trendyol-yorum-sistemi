import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { GET } from "./route";

describe("GET /api/admin/health", () => {
  beforeEach(async () => {
    await prisma.scrapeLog.deleteMany();
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("is healthy with fresh tracked products and reports stale products otherwise", async () => {
    const fresh = await prisma.product.create({
      data: {
        trendyolProductId: "fresh",
        trendyolUrl: "https://x",
        name: "Güncel",
        lastScrapedAt: new Date(),
        account: { create: { name: "test-account" } },
      },
    });
    await prisma.scrapeLog.create({ data: { productId: fresh.id, status: "success" } });

    const healthy = await GET();
    expect(healthy.status).toBe(200);
    expect((await healthy.json()).status).toBe("ok");

    await prisma.product.update({
      where: { id: fresh.id },
      data: { lastScrapedAt: new Date(Date.now() - 7 * 60 * 60 * 1000) },
    });
    const degraded = await GET();
    const body = await degraded.json();
    expect(degraded.status).toBe(503);
    expect(body).toMatchObject({ status: "degraded", staleProductCount: 1 });
  });
});
