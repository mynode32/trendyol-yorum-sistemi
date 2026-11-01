import { describe, expect, it } from "vitest";
import { createInviteToken, hashInviteToken, inviteExpiry, isInviteUsable } from "./invites";

describe("signup invitations", () => {
  it("generates a high-entropy URL-safe token and stores only its hash", () => {
    const token = createInviteToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(hashInviteToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashInviteToken(token)).not.toContain(token);
  });

  it("expires after seven days and cannot be reused", () => {
    const now = new Date("2026-11-01T12:00:00Z");
    const expiresAt = inviteExpiry(now);
    expect(expiresAt.toISOString()).toBe("2026-11-08T12:00:00.000Z");
    expect(isInviteUsable({ acceptedAt: null, expiresAt }, now)).toBe(true);
    expect(isInviteUsable({ acceptedAt: null, expiresAt }, expiresAt)).toBe(false);
    expect(isInviteUsable({ acceptedAt: now, expiresAt }, now)).toBe(false);
  });
});
