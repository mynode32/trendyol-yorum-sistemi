import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { runScheduledScrape } from "./scheduler";
import * as persist from "./persist";

describe("runScheduledScrape", () => {
  beforeEach(async () => {
    await prisma.scrapeLog.deleteMany();
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("scrapes every tracked product sequentially and skips untracked ones", async () => {
    const tracked = await prisma.product.create({
      data: { trendyolProductId: "t1", trendyolUrl: "https://x", name: "Takip Edilen", isTracked: true },
    });
    await prisma.product.create({
      data: { trendyolProductId: "t2", trendyolUrl: "https://x", name: "Takip Edilmeyen", isTracked: false },
    });

    const scrapeProductSpy = vi
      .spyOn(persist, "scrapeProduct")
      .mockResolvedValue({ status: "success", newReviews: 0 });

    await runScheduledScrape();

    expect(scrapeProductSpy).toHaveBeenCalledTimes(1);
    expect(scrapeProductSpy).toHaveBeenCalledWith(tracked.id);
  });

  it("continues to the next product when one scrape fails", async () => {
    const p1 = await prisma.product.create({
      data: { trendyolProductId: "t1", trendyolUrl: "https://x", name: "1", isTracked: true },
    });
    const p2 = await prisma.product.create({
      data: { trendyolProductId: "t2", trendyolUrl: "https://x", name: "2", isTracked: true },
    });

    const scrapeProductSpy = vi
      .spyOn(persist, "scrapeProduct")
      .mockImplementation(async (productId: string) => {
        if (productId === p1.id) throw new Error("boom");
        return { status: "success", newReviews: 0 };
      });

    await runScheduledScrape();

    expect(scrapeProductSpy).toHaveBeenCalledTimes(2);
    expect(scrapeProductSpy).toHaveBeenCalledWith(p2.id);
  });
});
