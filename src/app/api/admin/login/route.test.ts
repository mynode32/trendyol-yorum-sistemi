import { describe, it, expect, beforeEach } from "vitest";
import { resetLoginRateLimiter } from "@/lib/auth/rateLimit";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { POST } from "./route";

function loginRequest(email: string, password: string, ip = "9.9.9.9") {
  return new Request("http://localhost/api/admin/login", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
    body: JSON.stringify({ email, password }),
  });
}

describe("POST /api/admin/login", () => {
  beforeEach(async () => {
    resetLoginRateLimiter();
    process.env.SESSION_SECRET = "test-secret-32-characters-long!!";

    await prisma.scrapeLog.deleteMany();
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
    await prisma.account.deleteMany();

    const account = await prisma.account.create({ data: { name: "test-account" } });
    await prisma.user.create({
      data: {
        accountId: account.id,
        email: "owner@example.com",
        passwordHash: await hashPassword("correct-password"),
      },
    });
  });

  it("logs in with the correct email/password and sets a session cookie", async () => {
    const response = await POST(loginRequest("owner@example.com", "correct-password"));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("ty_admin_session=");
  });

  it("rejects an unknown email", async () => {
    const response = await POST(loginRequest("nobody@example.com", "correct-password"));
    expect(response.status).toBe(401);
  });

  it("rejects a known email with the wrong password", async () => {
    const response = await POST(loginRequest("owner@example.com", "wrong-password"));
    expect(response.status).toBe(401);
  });

  it("returns 429 RATE_LIMITED after 5 failed attempts from the same IP", async () => {
    for (let i = 0; i < 5; i++) {
      await POST(loginRequest("owner@example.com", "wrong"));
    }

    const response = await POST(loginRequest("owner@example.com", "wrong"));
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("still rejects correct credentials once the IP is rate limited", async () => {
    for (let i = 0; i < 5; i++) {
      await POST(loginRequest("owner@example.com", "wrong"));
    }

    const response = await POST(loginRequest("owner@example.com", "correct-password"));
    expect(response.status).toBe(429);
  });

  it("does not rate limit a different IP", async () => {
    for (let i = 0; i < 5; i++) {
      await POST(loginRequest("owner@example.com", "wrong", "1.1.1.1"));
    }

    const response = await POST(loginRequest("owner@example.com", "wrong", "2.2.2.2"));
    expect(response.status).toBe(401);
  });

  it("returns 400 for malformed or invalid request bodies", async () => {
    const malformed = await POST(new Request("http://localhost/api/admin/login", { method: "POST", body: "{" }));
    const emptyPassword = await POST(
      new Request("http://localhost/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ email: "owner@example.com", password: "" }),
      })
    );
    expect(malformed.status).toBe(400);
    expect(emptyPassword.status).toBe(400);
  });
});
