import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createSessionToken } from "@/lib/auth/session";
import { GET } from "./route";

describe("GET /api/admin/health", () => {
  let accountId: string;
  let sessionCookie: string;

  function authedRequest() {
    return new Request("http://localhost/api/admin/health", {
      headers: { cookie: `ty_admin_session=${sessionCookie}` },
    });
  }

  beforeEach(async () => {
    process.env.SESSION_SECRET = "test-secret-32-characters-long!!";
    await prisma.scrapeLog.deleteMany();
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
    await prisma.account.deleteMany();

    const account = await prisma.account.create({ data: { name: "test-account" } });
    accountId = account.id;
    const user = await prisma.user.create({
      data: { accountId, email: "owner@example.com", passwordHash: "irrelevant" },
    });
    sessionCookie = createSessionToken(user.id, user.sessionVersion);
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
        accountId,
      },
    });
    await prisma.scrapeLog.create({ data: { productId: fresh.id, status: "success" } });

    const healthy = await GET(authedRequest());
    expect(healthy.status).toBe(200);
    expect((await healthy.json()).status).toBe("ok");

    await prisma.product.update({
      where: { id: fresh.id },
      data: { lastScrapedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000) },
    });
    const degraded = await GET(authedRequest());
    const body = await degraded.json();
    expect(degraded.status).toBe(503);
    expect(body).toMatchObject({ status: "degraded", staleProductCount: 1 });
  });

  it("does not expose another account's stale products or scrape logs", async () => {
    const otherAccount = await prisma.account.create({ data: { name: "other-account" } });
    const otherProduct = await prisma.product.create({
      data: {
        accountId: otherAccount.id,
        trendyolProductId: "other-stale",
        trendyolUrl: "https://x",
        name: "Other",
        lastScrapedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.scrapeLog.create({ data: { productId: otherProduct.id, status: "failed" } });

    const response = await GET(authedRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ status: "ok", trackedProductCount: 0, staleProductCount: 0, lastScrape: null });
  });
});
