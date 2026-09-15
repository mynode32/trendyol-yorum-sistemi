import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createSessionToken, verifySessionToken, MAX_SESSION_AGE_MS } from "./session";

describe("session token", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "test-secret-32-characters-long!!";
  });

  it("creates a token that verifies successfully and carries the user id", () => {
    const token = createSessionToken("user_123");
    expect(verifySessionToken(token)).toEqual({ userId: "user_123", sessionVersion: 0 });
  });

  it("rejects a tampered token", () => {
    const token = createSessionToken("user_123");
    expect(verifySessionToken(token + "tampered")).toBeNull();
  });

  it("rejects garbage input", () => {
    expect(verifySessionToken("not-a-real-token")).toBeNull();
  });

  describe("expiry", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("rejects a token older than the max session age", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-09-08T00:00:00Z"));

      const token = createSessionToken("user_123");
      expect(verifySessionToken(token)).toEqual({ userId: "user_123", sessionVersion: 0 });

      // Süre sınırının hemen altında hâlâ geçerli
      vi.setSystemTime(new Date(Date.now() + MAX_SESSION_AGE_MS - 1000));
      expect(verifySessionToken(token)).toEqual({ userId: "user_123", sessionVersion: 0 });

      // Süre sınırı aşıldığında imza doğru olsa bile reddedilir
      vi.setSystemTime(new Date(Date.now() + 2000));
      expect(verifySessionToken(token)).toBeNull();
    });
  });
});
