import { createHmac, timingSafeEqual } from "crypto";

/** Oturum ömrü — login route'undaki cookie maxAge'i bu değerden türetilir. */
export const MAX_SESSION_AGE_MS = 24 * 60 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET tanımlı değil");
  return secret;
}

export function createSessionToken(): string {
  const payload = `admin:${Date.now()}`;
  const signature = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

const HEX_SHA256 = /^[0-9a-f]{64}$/;

export function verifySessionToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const [payload, signature] = decoded.split(".");
    if (!payload || !signature || !HEX_SHA256.test(signature)) return false;

    const expected = createHmac("sha256", getSecret()).update(payload).digest("hex");
    const expectedBuf = Buffer.from(expected, "hex");
    const actualBuf = Buffer.from(signature, "hex");

    if (expectedBuf.length !== actualBuf.length) return false;
    if (!timingSafeEqual(expectedBuf, actualBuf)) return false;

    // İmza doğru olsa bile süresi dolmuş token kabul edilmez — aksi halde ele
    // geçirilen bir token süresiz geçerli kalır.
    const [prefix, issuedAtRaw] = payload.split(":");
    if (prefix !== "admin") return false;
    const issuedAt = Number(issuedAtRaw);
    if (!Number.isFinite(issuedAt)) return false;

    return Date.now() - issuedAt <= MAX_SESSION_AGE_MS;
  } catch {
    return false;
  }
}
