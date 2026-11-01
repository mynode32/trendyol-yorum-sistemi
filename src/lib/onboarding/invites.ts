import { createHash, randomBytes } from "crypto";
import type { AccountPlan } from "@/lib/billing/plans";

export const INVITE_VALIDITY_DAYS = 7;

export function createInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function inviteExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + INVITE_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
}

export function isSellablePlan(plan: string): plan is Exclude<AccountPlan, "LEGACY"> {
  return plan === "STARTER" || plan === "PRO";
}

export function isInviteUsable(invite: { acceptedAt: Date | null; expiresAt: Date }, now: Date = new Date()): boolean {
  return invite.acceptedAt === null && invite.expiresAt > now;
}
