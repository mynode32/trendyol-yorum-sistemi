import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { createSessionToken } from "@/lib/auth/session";

const { scrapeProductMock } = vi.hoisted(() => ({ scrapeProductMock: vi.fn() }));
vi.mock("@/lib/scraper/persist", () => ({ scrapeProduct: scrapeProductMock }));

import { POST } from "./route";

let accountId: string;
let otherAccountId: string;
let sessionCookie: string;

function authedRequest() {
  return new Request("http://localhost", { method: "POST", headers: { cookie: `ty_admin_session=${sessionCookie}`, origin: "http://localhost" } });
}

describe("POST /api/admin/products/:id/scrape", () => {
  beforeEach(async () => {
    process.env.SESSION_SECRET = "test-secret-32-characters-long!!";

    await prisma.scrapeLog.deleteMany();
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
    await prisma.account.deleteMany();
    scrapeProductMock.mockReset();

    const account = await prisma.account.create({ data: { name: "test-account" } });
    accountId = account.id;
    const otherAccount = await prisma.account.create({ data: { name: "other-account" } });
    otherAccountId = otherAccount.id;
    const user = await prisma.user.create({
      data: { accountId, email: "owner@example.com", passwordHash: "irrelevant-for-these-tests" },
    });
    sessionCookie = createSessionToken(user.id);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 UNAUTHORIZED without a valid session", async () => {
    const response = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: "does-not-matter" }),
    });
    expect(response.status).toBe(401);
  });

  it("runs a known product scrape and returns the result", async () => {
    const product = await prisma.product.create({
      data: { accountId, trendyolProductId: "p-1", trendyolUrl: "https://x", name: "Ürün" },
    });
    scrapeProductMock.mockResolvedValue({ status: "success", newReviews: 3 });

    const response = await POST(authedRequest(), { params: Promise.resolve({ id: product.id }) });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "success", newReviews: 3 });
    expect(scrapeProductMock).toHaveBeenCalledWith(product.id);
  });

  it("returns 404 for a product that belongs to another account, without scraping it", async () => {
    const otherProduct = await prisma.product.create({
      data: { accountId: otherAccountId, trendyolProductId: "p-1", trendyolUrl: "https://x", name: "Başka hesabın ürünü" },
    });

    const response = await POST(authedRequest(), { params: Promise.resolve({ id: otherProduct.id }) });

    expect(response.status).toBe(404);
    expect(scrapeProductMock).not.toHaveBeenCalled();
  });

  it("returns a useful error when scraping fails or product is unknown", async () => {
    const product = await prisma.product.create({
      data: { accountId, trendyolProductId: "p-2", trendyolUrl: "https://x", name: "Ürün" },
    });
    scrapeProductMock.mockResolvedValue({ status: "failed", newReviews: 0 });

    const failed = await POST(authedRequest(), { params: Promise.resolve({ id: product.id }) });
    const unknown = await POST(authedRequest(), { params: Promise.resolve({ id: "unknown" }) });

    expect(failed.status).toBe(502);
    expect((await failed.json()).error.code).toBe("SCRAPE_FAILED");
    expect(unknown.status).toBe(404);
  });
});
