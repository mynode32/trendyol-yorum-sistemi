import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { createSessionToken } from "@/lib/auth/session";
import { GET, POST } from "./route";

let accountId: string;
let otherAccountId: string;
let sessionCookie: string;

function authedRequest(url: string, init: RequestInit = {}) {
  return new Request(url, {
    ...init,
    headers: { ...init.headers, cookie: `ty_admin_session=${sessionCookie}`, origin: "http://localhost" },
  });
}

describe("/api/admin/users", () => {
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
    const response = await GET(new Request("http://localhost/api/admin/users"));
    expect(response.status).toBe(401);
  });

  it("lists only the logged-in account's users, oldest first", async () => {
    await prisma.user.create({
      data: { accountId, email: "teammate@example.com", passwordHash: "irrelevant" },
    });
    await prisma.user.create({
      data: { accountId: otherAccountId, email: "someone-else@example.com", passwordHash: "irrelevant" },
    });

    const response = await GET(authedRequest("http://localhost/api/admin/users"));
    const body = await response.json();

    expect(body.data.map((u: { email: string }) => u.email)).toEqual([
      "owner@example.com",
      "teammate@example.com",
    ]);
    expect(body.data[0].passwordHash).toBeUndefined();
  });

  it("creates a new user under the logged-in account", async () => {
    const request = authedRequest("http://localhost/api/admin/users", {
      method: "POST",
      body: JSON.stringify({ email: "teammate@example.com", password: "a-strong-password" }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.email).toBe("teammate@example.com");

    const created = await prisma.user.findUniqueOrThrow({ where: { email: "teammate@example.com" } });
    expect(created.accountId).toBe(accountId);
    expect(created.passwordHash).not.toBe("a-strong-password");
  });

  it("returns 409 CONFLICT when the email is already in use", async () => {
    await prisma.user.create({
      data: { accountId, email: "teammate@example.com", passwordHash: "irrelevant" },
    });

    const request = authedRequest("http://localhost/api/admin/users", {
      method: "POST",
      body: JSON.stringify({ email: "teammate@example.com", password: "a-strong-password" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe("CONFLICT");
  });

  it("returns 400 INVALID_BODY for an invalid email or short password", async () => {
    const request = authedRequest("http://localhost/api/admin/users", {
      method: "POST",
      body: JSON.stringify({ email: "not-an-email", password: "short" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_BODY");
  });
});
