import { createHmac, timingSafeEqual } from "crypto";

/** Oturum ömrü — login route'undaki cookie maxAge'i bu değerden türetilir. */
export const MAX_SESSION_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_FUTURE_ISSUED_AT_MS = 5 * 60 * 1000;
const BASE64URL_TOKEN = /^[A-Za-z0-9_-]{1,1024}$/;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (
    !secret ||
    secret.length < 32 ||
    /changeme|change-me|example|default/i.test(secret)
  ) {
    throw new Error("SESSION_SECRET en az 32 karakterlik, rastgele bir değer olmalı");
  }
  return secret;
}

export function createSessionToken(userId: string, sessionVersion = 0): string {
  const payload = `user:${userId}:${sessionVersion}:${Date.now()}`;
  const signature = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

const HEX_SHA256 = /^[0-9a-f]{64}$/;

export type Session = { userId: string; sessionVersion: number };

export function verifySessionToken(token: string): Session | null {
  try {
    if (!BASE64URL_TOKEN.test(token)) return null;
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const parts = decoded.split(".");
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;
    if (!payload || !signature || !HEX_SHA256.test(signature)) return null;

    const expected = createHmac("sha256", getSecret()).update(payload).digest("hex");
    const expectedBuf = Buffer.from(expected, "hex");
    const actualBuf = Buffer.from(signature, "hex");

    if (expectedBuf.length !== actualBuf.length) return null;
    if (!timingSafeEqual(expectedBuf, actualBuf)) return null;

    // İmza doğru olsa bile süresi dolmuş token kabul edilmez — aksi halde ele
    // geçirilen bir token süresiz geçerli kalır.
    const payloadParts = payload.split(":");
    if (payloadParts.length !== 4) return null;
    const [prefix, userId, sessionVersionRaw, issuedAtRaw] = payloadParts;
    if (prefix !== "user" || !userId) return null;
    const sessionVersion = Number(sessionVersionRaw);
    const issuedAt = Number(issuedAtRaw);
    if (!Number.isSafeInteger(sessionVersion) || sessionVersion < 0 || !Number.isSafeInteger(issuedAt)) {
      return null;
    }
    if (issuedAt > Date.now() + MAX_FUTURE_ISSUED_AT_MS) return null;
    if (Date.now() - issuedAt > MAX_SESSION_AGE_MS) return null;

    return { userId, sessionVersion };
  } catch {
    return null;
  }
}
