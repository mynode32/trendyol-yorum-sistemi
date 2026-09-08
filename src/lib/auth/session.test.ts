import { describe, it, expect, beforeEach } from "vitest";
import { createSessionToken, verifySessionToken } from "./session";

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
});
