import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { resolveDisplayProductIds } from "./group";

describe("resolveDisplayProductIds", () => {
  beforeEach(async () => {
    await prisma.scrapeLog.deleteMany();
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns just the product's own id when reviewGroupId is not set", async () => {
    const product = await prisma.product.create({
      data: { trendyolProductId: "1", trendyolUrl: "https://x", name: "Ürün 1" },
    });

    const ids = await resolveDisplayProductIds(product);

    expect(ids).toEqual([product.id]);
  });

  it("returns every product sharing the same reviewGroupId and storeId", async () => {
    const a = await prisma.product.create({
      data: {
        trendyolProductId: "1",
        trendyolUrl: "https://x",
        name: "140cm",
        storeId: "enwood",
        reviewGroupId: "capella-tv-unitesi",
      },
    });
    const b = await prisma.product.create({
      data: {
        trendyolProductId: "2",
        trendyolUrl: "https://x",
        name: "160cm",
        storeId: "enwood",
        reviewGroupId: "capella-tv-unitesi",
      },
    });
    await prisma.product.create({
      data: { trendyolProductId: "3", trendyolUrl: "https://x", name: "unrelated" },
    });

    const ids = await resolveDisplayProductIds(a);

    expect(ids.sort()).toEqual([a.id, b.id].sort());
  });

  it("does not pool across different storeIds even with the same reviewGroupId", async () => {
    const a = await prisma.product.create({
      data: {
        trendyolProductId: "1",
        trendyolUrl: "https://x",
        name: "enwood variant",
        storeId: "enwood",
        reviewGroupId: "shared-name-collision",
      },
    });
    await prisma.product.create({
      data: {
        trendyolProductId: "2",
        trendyolUrl: "https://x",
        name: "other store variant",
        storeId: "othercustomer",
        reviewGroupId: "shared-name-collision",
      },
    });

    const ids = await resolveDisplayProductIds(a);

    expect(ids).toEqual([a.id]);
  });
});
