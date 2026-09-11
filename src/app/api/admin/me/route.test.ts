import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { createSessionToken } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { GET, PATCH } from "./route";

function authedRequest(url: string, token: string, init: RequestInit = {}) {
  return new Request(url, {
    ...init,
    headers: { ...init.headers, cookie: `ty_admin_session=${token}` },
  });
}

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

    const response = await GET(authedRequest("http://localhost/api/admin/me", token));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ email: "owner@example.com", accountName: "some-customer" });
  });

  it("returns 401 without a valid session cookie", async () => {
    const response = await GET(new Request("http://localhost/api/admin/me"));
    expect(response.status).toBe(401);
  });
});

describe("PATCH /api/admin/me (password change)", () => {
  beforeEach(async () => {
    process.env.SESSION_SECRET = "test-secret-32-characters-long!!";
    await prisma.scrapeLog.deleteMany();
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
    await prisma.account.deleteMany();
  });

  it("returns 401 without a valid session", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/admin/me", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword: "a", newPassword: "newpassword123" }),
      })
    );
    expect(response.status).toBe(401);
  });

  it("changes the password when the current password is correct", async () => {
    const account = await prisma.account.create({ data: { name: "some-customer" } });
    const user = await prisma.user.create({
      data: { accountId: account.id, email: "owner@example.com", passwordHash: await hashPassword("old-password") },
    });
    const token = createSessionToken(user.id);

    const response = await PATCH(
      authedRequest("http://localhost/api/admin/me", token, {
        method: "PATCH",
        body: JSON.stringify({ currentPassword: "old-password", newPassword: "new-password-123" }),
      })
    );

    expect(response.status).toBe(200);
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await verifyPassword("new-password-123", updated.passwordHash)).toBe(true);
    expect(await verifyPassword("old-password", updated.passwordHash)).toBe(false);
  });

  it("returns 401 INVALID_CREDENTIALS and leaves the password unchanged when currentPassword is wrong", async () => {
    const account = await prisma.account.create({ data: { name: "some-customer" } });
    const user = await prisma.user.create({
      data: { accountId: account.id, email: "owner@example.com", passwordHash: await hashPassword("old-password") },
    });
    const token = createSessionToken(user.id);

    const response = await PATCH(
      authedRequest("http://localhost/api/admin/me", token, {
        method: "PATCH",
        body: JSON.stringify({ currentPassword: "wrong-password", newPassword: "new-password-123" }),
      })
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_CREDENTIALS");
    const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await verifyPassword("old-password", unchanged.passwordHash)).toBe(true);
  });

  it("returns 400 INVALID_BODY when newPassword is shorter than 8 characters", async () => {
    const account = await prisma.account.create({ data: { name: "some-customer" } });
    const user = await prisma.user.create({
      data: { accountId: account.id, email: "owner@example.com", passwordHash: await hashPassword("old-password") },
    });
    const token = createSessionToken(user.id);

    const response = await PATCH(
      authedRequest("http://localhost/api/admin/me", token, {
        method: "PATCH",
        body: JSON.stringify({ currentPassword: "old-password", newPassword: "short" }),
      })
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_BODY");
  });
});
