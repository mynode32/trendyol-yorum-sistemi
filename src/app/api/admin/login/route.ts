import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, MAX_SESSION_AGE_MS } from "@/lib/auth/session";
import { isRateLimited, registerFailedLoginAttempt, clearLoginAttempts } from "@/lib/auth/rateLimit";

function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

const loginBodySchema = z.object({
  email: z.string().trim().min(1).max(320),
  password: z.string().min(1).max(1024),
});

export async function POST(request: Request) {
  const key = clientKey(request);

  if (isRateLimited(key)) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin." } },
      { status: 429 }
    );
  }

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

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  const passwordValid = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;

  if (!user || !passwordValid) {
    registerFailedLoginAttempt(key);
    return NextResponse.json(
      { error: { code: "INVALID_CREDENTIALS", message: "Email veya şifre hatalı" } },
      { status: 401 }
    );
  }

  clearLoginAttempts(key);
  const token = createSessionToken(user.id);
  const response = NextResponse.json({ ok: true });
  response.cookies.set("ty_admin_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: MAX_SESSION_AGE_MS / 1000,
  });
  return response;
}
