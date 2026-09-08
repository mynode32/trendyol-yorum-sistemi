import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("ty_admin_session")?.value;
  if (!token || !verifySessionToken(token)) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
  runtime: "nodejs",
};
