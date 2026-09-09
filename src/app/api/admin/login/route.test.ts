import { describe, it, expect, beforeEach } from "vitest";
import { resetLoginRateLimiter } from "@/lib/auth/rateLimit";
import { POST } from "./route";

function loginRequest(password: string, ip = "9.9.9.9") {
  return new Request("http://localhost/api/admin/login", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
    body: JSON.stringify({ password }),
  });
}

describe("POST /api/admin/login", () => {
  beforeEach(() => {
    resetLoginRateLimiter();
    process.env.ADMIN_PASSWORD = "correct-password";
    process.env.SESSION_SECRET = "test-secret-32-characters-long!!";
  });

  it("returns 429 RATE_LIMITED after 5 failed attempts from the same IP", async () => {
    for (let i = 0; i < 5; i++) {
      await POST(loginRequest("wrong"));
    }

    const response = await POST(loginRequest("wrong"));
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("still rejects a correct password once the IP is rate limited", async () => {
    for (let i = 0; i < 5; i++) {
      await POST(loginRequest("wrong"));
    }

    const response = await POST(loginRequest("correct-password"));
    expect(response.status).toBe(429);
  });

  it("does not rate limit a different IP", async () => {
    for (let i = 0; i < 5; i++) {
      await POST(loginRequest("wrong", "1.1.1.1"));
    }

    const response = await POST(loginRequest("wrong", "2.2.2.2"));
    expect(response.status).toBe(401);
  });
});
