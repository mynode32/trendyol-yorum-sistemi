import { NextResponse } from "next/server";
import { requireSameOrigin } from "@/lib/api/csrf";

export async function POST(request: Request) {
  const csrfError = requireSameOrigin(request);
  if (csrfError) return csrfError;

  const response = NextResponse.json({ ok: true });
  response.cookies.set("ty_admin_session", "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
  return response;
}
