import { NextResponse } from "next/server";
import { createSessionToken } from "@/lib/auth/session";

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
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return response;
}
