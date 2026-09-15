import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, MAX_SESSION_AGE_MS } from "@/lib/auth/session";
import { isRateLimited, registerFailedLoginAttempt, clearLoginAttempts } from "@/lib/auth/rateLimit";
import { requireSameOrigin } from "@/lib/api/csrf";

// Bilinmeyen kullanıcıda da bcrypt çalıştırarak kullanıcı varlığına göre oluşan
// yanıt süresi farkını kapatır. Bu değer bir parola değil, sadece sabit dummy hash'tir.
const DUMMY_PASSWORD_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.7sH6mOe7wDfx2qRnvN8aZG9W2E2wF6e";

function clientKey(request: Request): string {
  const candidate = request.headers.get("x-forwarded-for")?.split(",")[0].trim();
  // Proxy header'ı ham haliyle Map anahtarı yapmayız: uzun/özel karakterli
  // değerler bellek tüketimini artırabilir. E-posta bazlı limit ayrıca IP
  // header'ı spoof edilse bile parola denemelerini sınırlar.
  return candidate && /^[0-9a-f:.]{1,45}$/i.test(candidate) ? candidate : "unknown";
}

const loginBodySchema = z.object({
  email: z.string().trim().min(1).max(320),
  password: z.string().min(1).max(1024),
});

export async function POST(request: Request) {
  const csrfError = requireSameOrigin(request);
  if (csrfError) return csrfError;

  const key = clientKey(request);

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_BODY", message: "Geçerli bir JSON gövdesi gönderin" } },
      { status: 400 }
    );
  }
  const parsed = loginBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID_BODY", message: "Email ve şifre alanları geçerli olmalı" } },
      { status: 400 }
    );
  }

  const normalizedEmail = parsed.data.email.toLowerCase();
  const ipRateLimitKey = `ip:${key}`;
  const emailRateLimitKey = `email:${normalizedEmail}`;

  const [ipLimited, emailLimited] = await Promise.all([
    isRateLimited(ipRateLimitKey),
    isRateLimited(emailRateLimitKey),
  ]);
  if (ipLimited || emailLimited) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin." } },
      { status: 429 }
    );
  }

  // Eski kayıtlarda email büyük/küçük harfi normalize edilmemiş olabilir;
  // girişte mevcut kayıt davranışını koruyoruz. Limit anahtarı yine case-insensitive.
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  const passwordValid = await verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

  if (!user || !passwordValid) {
    await Promise.all([
      registerFailedLoginAttempt(ipRateLimitKey),
      registerFailedLoginAttempt(emailRateLimitKey),
    ]);
    return NextResponse.json(
      { error: { code: "INVALID_CREDENTIALS", message: "Email veya şifre hatalı" } },
      { status: 401 }
    );
  }

  await Promise.all([clearLoginAttempts(ipRateLimitKey), clearLoginAttempts(emailRateLimitKey)]);
  const token = createSessionToken(user.id, user.sessionVersion);
  const response = NextResponse.json({ ok: true });
  response.cookies.set("ty_admin_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    priority: "high",
    path: "/",
    maxAge: MAX_SESSION_AGE_MS / 1000,
  });
  return response;
}
