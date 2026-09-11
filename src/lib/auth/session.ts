import { createHmac, timingSafeEqual } from "crypto";

/** Oturum ömrü — login route'undaki cookie maxAge'i bu değerden türetilir. */
export const MAX_SESSION_AGE_MS = 24 * 60 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET tanımlı değil");
  return secret;
}

export function createSessionToken(userId: string): string {
  const payload = `user:${userId}:${Date.now()}`;
  const signature = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

const HEX_SHA256 = /^[0-9a-f]{64}$/;

export type Session = { userId: string };

export function verifySessionToken(token: string): Session | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const [payload, signature] = decoded.split(".");
    if (!payload || !signature || !HEX_SHA256.test(signature)) return null;

    const expected = createHmac("sha256", getSecret()).update(payload).digest("hex");
    const expectedBuf = Buffer.from(expected, "hex");
    const actualBuf = Buffer.from(signature, "hex");

    if (expectedBuf.length !== actualBuf.length) return null;
    if (!timingSafeEqual(expectedBuf, actualBuf)) return null;

    // İmza doğru olsa bile süresi dolmuş token kabul edilmez — aksi halde ele
    // geçirilen bir token süresiz geçerli kalır.
    const [prefix, userId, issuedAtRaw] = payload.split(":");
    if (prefix !== "user" || !userId) return null;
    const issuedAt = Number(issuedAtRaw);
    if (!Number.isFinite(issuedAt)) return null;
    if (Date.now() - issuedAt > MAX_SESSION_AGE_MS) return null;

    return { userId };
  } catch {
    return null;
  }
}
