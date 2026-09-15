import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  isRateLimited,
  registerFailedLoginAttempt,
  clearLoginAttempts,
  resetLoginRateLimiter,
} from "./rateLimit";

describe("login rate limiter", () => {
  beforeEach(() => {
    resetLoginRateLimiter();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is not rate limited before any failed attempts", async () => {
    expect(await isRateLimited("1.2.3.4")).toBe(false);
  });

  it("rate limits a key after 5 failed attempts", async () => {
    for (let i = 0; i < 5; i++) await registerFailedLoginAttempt("1.2.3.4");
    expect(await isRateLimited("1.2.3.4")).toBe(true);
  });

  it("does not rate limit a different key", async () => {
    for (let i = 0; i < 5; i++) await registerFailedLoginAttempt("1.2.3.4");
    expect(await isRateLimited("5.6.7.8")).toBe(false);
  });

  it("clears attempts on successful login", async () => {
    for (let i = 0; i < 5; i++) await registerFailedLoginAttempt("1.2.3.4");
    await clearLoginAttempts("1.2.3.4");
    expect(await isRateLimited("1.2.3.4")).toBe(false);
  });

  it("lifts the rate limit after the window expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-08T00:00:00Z"));
    for (let i = 0; i < 5; i++) await registerFailedLoginAttempt("1.2.3.4");
    expect(await isRateLimited("1.2.3.4")).toBe(true);

    vi.setSystemTime(new Date("2026-09-08T00:16:00Z"));
    expect(await isRateLimited("1.2.3.4")).toBe(false);
  });
});
