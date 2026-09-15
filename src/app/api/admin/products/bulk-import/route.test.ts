import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { createSessionToken } from "@/lib/auth/session";
import { POST } from "./route";
import * as client from "@/lib/scraper/trendyolClient";

let accountId: string;
let sessionCookie: string;

function authedRequest(body: unknown) {
  return new Request("http://localhost/api/admin/products/bulk-import", {
    method: "POST",
    headers: { cookie: `ty_admin_session=${sessionCookie}`, origin: "http://localhost" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/products/bulk-import", () => {
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
      data: { accountId, email: "owner@example.com", passwordHash: "irrelevant-for-these-tests" },
    });
    sessionCookie = createSessionToken(user.id);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 UNAUTHORIZED without a valid session", async () => {
    const request = new Request("http://localhost/api/admin/products/bulk-import", {
      method: "POST",
      body: JSON.stringify({ sellerUrl: "https://www.trendyol.com/enwood-x-b171291" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("discovers seller products, creates only the ones not already tracked, and scopes them to the logged-in account", async () => {
    await prisma.product.create({
      data: { accountId, trendyolProductId: "111", trendyolUrl: "https://x", name: "Zaten Ekli" },
    });
    vi.spyOn(client, "discoverSellerProductIds").mockResolvedValue(["111", "222", "333"]);

    const response = await POST(authedRequest({ sellerUrl: "https://www.trendyol.com/enwood-x-b171291" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ discovered: 3, added: 2, skipped: 1 });

    const products = await prisma.product.findMany({ orderBy: { trendyolProductId: "asc" } });
    expect(products.map((p) => p.trendyolProductId)).toEqual(["111", "222", "333"]);
    expect(products.every((p) => p.accountId === accountId)).toBe(true);
  });

  it("applies the given storeId and minRating to all newly created products", async () => {
    vi.spyOn(client, "discoverSellerProductIds").mockResolvedValue(["444"]);

    const response = await POST(
      authedRequest({ sellerUrl: "https://www.trendyol.com/enwood-x-b171291", storeId: "enwood", minRating: 4 })
    );
    expect(response.status).toBe(200);

    const product = await prisma.product.findUniqueOrThrow({ where: { trendyolProductId: "444" } });
    expect(product.storeId).toBe("enwood");
    expect(product.minRating).toBe(4);
  });

  it("returns 400 INVALID_URL for a non-trendyol seller URL", async () => {
    const response = await POST(authedRequest({ sellerUrl: "https://evil.example.com/enwood" }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_URL");
  });

  it("returns 502 SELLER_FETCH_FAILED when discovery throws, without a 500", async () => {
    vi.spyOn(client, "discoverSellerProductIds").mockRejectedValue(new Error("tarayıcı çöktü"));

    const response = await POST(authedRequest({ sellerUrl: "https://www.trendyol.com/enwood-x-b171291" }));

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error.code).toBe("SELLER_FETCH_FAILED");
  });
});
