import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { createSessionToken } from "@/lib/auth/session";
import { GET } from "./route";

describe("GET /api/admin/me", () => {
  beforeEach(async () => {
    process.env.SESSION_SECRET = "test-secret-32-characters-long!!";
    await prisma.scrapeLog.deleteMany();
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
    await prisma.account.deleteMany();
  });

  it("returns the logged-in user's email and account name", async () => {
    const account = await prisma.account.create({ data: { name: "some-customer" } });
    const user = await prisma.user.create({
      data: { accountId: account.id, email: "owner@example.com", passwordHash: "irrelevant" },
    });
    const token = createSessionToken(user.id);

    const response = await GET(
      new Request("http://localhost/api/admin/me", { headers: { cookie: `ty_admin_session=${token}` } })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ email: "owner@example.com", accountName: "some-customer" });
  });

  it("returns 401 without a valid session cookie", async () => {
    const response = await GET(new Request("http://localhost/api/admin/me"));
    expect(response.status).toBe(401);
  });
});
