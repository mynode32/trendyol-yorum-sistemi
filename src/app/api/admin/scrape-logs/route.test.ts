import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { createSessionToken } from "@/lib/auth/session";
import { GET } from "./route";

let accountId: string;
let otherAccountId: string;
let sessionCookie: string;

function authedRequest() {
  return new Request("http://localhost/api/admin/scrape-logs", {
    headers: { cookie: `ty_admin_session=${sessionCookie}` },
  });
}

describe("GET /api/admin/scrape-logs", () => {
  beforeEach(async () => {
    process.env.SESSION_SECRET = "test-secret-32-characters-long!!";

    await prisma.scrapeLog.deleteMany();
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
    await prisma.account.deleteMany();

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
    const response = await GET(new Request("http://localhost/api/admin/scrape-logs"));
    expect(response.status).toBe(401);
  });

  it("lists only the logged-in account's scrape logs", async () => {
    const product = await prisma.product.create({
      data: { accountId, trendyolProductId: "1", trendyolUrl: "https://x", name: "Ürün" },
    });
    const otherProduct = await prisma.product.create({
      data: { accountId: otherAccountId, trendyolProductId: "2", trendyolUrl: "https://x", name: "Başka hesabın ürünü" },
    });
    await prisma.scrapeLog.create({ data: { productId: product.id, status: "success" } });
    await prisma.scrapeLog.create({ data: { productId: otherProduct.id, status: "success" } });

    const response = await GET(authedRequest());
    const body = await response.json();

    expect(body.data).toHaveLength(1);
    expect(body.data[0].product.name).toBe("Ürün");
  });
});
