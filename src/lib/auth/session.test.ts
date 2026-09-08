import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createSessionToken, verifySessionToken, MAX_SESSION_AGE_MS } from "./session";

describe("session token", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "test-secret-32-characters-long!!";
  });

  it("creates a token that verifies successfully", () => {
    const token = createSessionToken();
    expect(verifySessionToken(token)).toBe(true);
  });

  it("rejects a tampered token", () => {
    const token = createSessionToken();
    expect(verifySessionToken(token + "tampered")).toBe(false);
  });

  it("rejects garbage input", () => {
    expect(verifySessionToken("not-a-real-token")).toBe(false);
  });

  describe("expiry", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("rejects a token older than the max session age", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-09-08T00:00:00Z"));

      const token = createSessionToken();
      expect(verifySessionToken(token)).toBe(true);

      // Süre sınırının hemen altında hâlâ geçerli
      vi.setSystemTime(new Date(Date.now() + MAX_SESSION_AGE_MS - 1000));
      expect(verifySessionToken(token)).toBe(true);

      // Süre sınırı aşıldığında imza doğru olsa bile reddedilir
      vi.setSystemTime(new Date(Date.now() + 2000));
      expect(verifySessionToken(token)).toBe(false);
    });
  });
});
