import { NextResponse } from "next/server";
import { createSessionToken, MAX_SESSION_AGE_MS } from "@/lib/auth/session";

export async function POST(request: Request) {
  const { password } = await request.json();

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: { code: "INVALID_CREDENTIALS", message: "Şifre hatalı" } },
      { status: 401 }
    );
  }

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
