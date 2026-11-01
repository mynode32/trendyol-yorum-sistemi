import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { hashInviteToken } from "@/lib/onboarding/invites";
import { GET, POST } from "./route";

const token = "test-invite-token-that-is-long-enough-1234567890";

function context(value = token) {
  return { params: Promise.resolve({ token: value }) };
}

function postRequest(password = "a-safe-password-123") {
  return new Request(`http://localhost/api/onboarding/invites/${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: "http://localhost" },
    body: JSON.stringify({ password }),
  });
}

describe("signup invite API", () => {
  beforeEach(async () => {
    process.env.SESSION_SECRET = "test-secret-32-characters-long!!";
    await prisma.signupInvite.deleteMany();
    await prisma.scrapeLog.deleteMany();
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
    await prisma.account.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("shows only an active invite and prevents caching", async () => {
    await prisma.signupInvite.create({
      data: {
        email: "owner@example.com",
        accountName: "Yeni Mağaza",
        plan: "STARTER",
        tokenHash: hashInviteToken(token),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const response = await GET(new Request("http://localhost"), context());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ email: "owner@example.com", accountName: "Yeni Mağaza", plan: "STARTER" });
  });

  it("creates one account and owner session from an invite exactly once", async () => {
    await prisma.signupInvite.create({
      data: {
        email: "owner@example.com",
        accountName: "Yeni Mağaza",
        plan: "PRO",
        tokenHash: hashInviteToken(token),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const first = await POST(postRequest(), context());
    expect(first.status).toBe(201);
    expect(first.headers.get("set-cookie")).toContain("ty_admin_session=");
    const account = await prisma.account.findFirstOrThrow({ where: { name: "Yeni Mağaza" } });
    expect(account.plan).toBe("PRO");
    expect(await prisma.user.count({ where: { accountId: account.id, role: "OWNER" } })).toBe(1);

    const second = await POST(postRequest(), context());
    expect(second.status).toBe(404);
    expect(await prisma.account.count({ where: { name: "Yeni Mağaza" } })).toBe(1);
  });

  it("rejects an expired invite without creating an account", async () => {
    await prisma.signupInvite.create({
      data: {
        email: "owner@example.com",
        accountName: "Eski Mağaza",
        plan: "STARTER",
        tokenHash: hashInviteToken(token),
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    const response = await POST(postRequest(), context());
    expect(response.status).toBe(404);
    expect(await prisma.account.count()).toBe(0);
  });

  it("returns a safe conflict when the invited email already has an account", async () => {
    const existingAccount = await prisma.account.create({ data: { name: "Mevcut" } });
    await prisma.user.create({ data: { accountId: existingAccount.id, email: "owner@example.com", passwordHash: "irrelevant" } });
    await prisma.signupInvite.create({
      data: {
        email: "owner@example.com",
        accountName: "Yeni Mağaza",
        plan: "STARTER",
        tokenHash: hashInviteToken(token),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const response = await POST(postRequest(), context());
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("EMAIL_IN_USE");
    expect(await prisma.signupInvite.findUniqueOrThrow({ where: { tokenHash: hashInviteToken(token) } })).toMatchObject({ acceptedAt: null });
  });
});
