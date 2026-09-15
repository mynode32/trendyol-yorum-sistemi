import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { createSessionToken } from "@/lib/auth/session";
import { DELETE } from "./route";

let accountId: string;
let otherAccountId: string;
let ownerId: string;
let sessionCookie: string;

function authedRequest(url: string) {
  return new Request(url, { method: "DELETE", headers: { cookie: `ty_admin_session=${sessionCookie}`, origin: "http://localhost" } });
}

describe("DELETE /api/admin/users/:id", () => {
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
    const owner = await prisma.user.create({
      data: { accountId, email: "owner@example.com", passwordHash: "irrelevant" },
    });
    ownerId = owner.id;
    sessionCookie = createSessionToken(owner.id);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 UNAUTHORIZED without a valid session", async () => {
    const response = await DELETE(new Request("http://localhost/api/admin/users/does-not-matter", { method: "DELETE" }), {
      params: Promise.resolve({ id: "does-not-matter" }),
    });
    expect(response.status).toBe(401);
  });

  it("removes a teammate from the same account", async () => {
    const teammate = await prisma.user.create({
      data: { accountId, email: "teammate@example.com", passwordHash: "irrelevant" },
    });

    const response = await DELETE(authedRequest(`http://localhost/api/admin/users/${teammate.id}`), {
      params: Promise.resolve({ id: teammate.id }),
    });

    expect(response.status).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: teammate.id } })).toBeNull();
  });

  it("refuses to remove yourself", async () => {
    const response = await DELETE(authedRequest(`http://localhost/api/admin/users/${ownerId}`), {
      params: Promise.resolve({ id: ownerId }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("CANNOT_REMOVE_SELF");
    expect(await prisma.user.findUnique({ where: { id: ownerId } })).not.toBeNull();
  });

  it("can never bring an account down to zero users, since you can only remove others", async () => {
    const teammate = await prisma.user.create({
      data: { accountId, email: "teammate@example.com", passwordHash: "irrelevant" },
    });

    await DELETE(authedRequest(`http://localhost/api/admin/users/${teammate.id}`), {
      params: Promise.resolve({ id: teammate.id }),
    });

    // Only the owner (the one who's logged in) is left, and they can't remove themselves.
    const selfDelete = await DELETE(authedRequest(`http://localhost/api/admin/users/${ownerId}`), {
      params: Promise.resolve({ id: ownerId }),
    });
    expect(selfDelete.status).toBe(400);
    expect(await prisma.user.count({ where: { accountId } })).toBe(1);
  });

  it("returns 404 for a user belonging to another account", async () => {
    const otherUser = await prisma.user.create({
      data: { accountId: otherAccountId, email: "someone-else@example.com", passwordHash: "irrelevant" },
    });

    const response = await DELETE(authedRequest(`http://localhost/api/admin/users/${otherUser.id}`), {
      params: Promise.resolve({ id: otherUser.id }),
    });

    expect(response.status).toBe(404);
    expect(await prisma.user.findUnique({ where: { id: otherUser.id } })).not.toBeNull();
  });
});
