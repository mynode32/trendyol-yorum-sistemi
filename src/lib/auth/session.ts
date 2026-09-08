import { createHmac, timingSafeEqual } from "crypto";

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
    return timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}
