import { NextResponse } from "next/server";
import { createSessionToken, MAX_SESSION_AGE_MS } from "@/lib/auth/session";
import { isRateLimited, registerFailedLoginAttempt, clearLoginAttempts } from "@/lib/auth/rateLimit";

function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

export async function POST(request: Request) {
  const key = clientKey(request);

  if (isRateLimited(key)) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin." } },
      { status: 429 }
    );
  }

  const { password } = await request.json();

  if (password !== process.env.ADMIN_PASSWORD) {
    registerFailedLoginAttempt(key);
    return NextResponse.json(
      { error: { code: "INVALID_CREDENTIALS", message: "Şifre hatalı" } },
      { status: 401 }
    );
  }

  clearLoginAttempts(key);
  const token = createSessionToken();
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
