import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";

// Next'in kendi hydration/RSC script'leri, CSP yanıt başlığındaki nonce'u otomatik
// okuyup uygular; bu sayede script-src'ten 'unsafe-inline' kaldırılabilir.
// Next bu nonce'u response header'ından değil, middleware'in NextResponse.next()'e
// ilettiği REQUEST header'ından okur — sadece response'a yazmak yeterli değil,
// aksi halde kendi script'lerine nonce eklemez ve strict-dynamic hepsini bloklar.
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    // strict-dynamic destekleyen tarayıcılarda 'self' yok sayılır; eski
    // tarayıcılar için düşer. Dev'de Fast Refresh eval kullanır.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const nextInit = { request: { headers: requestHeaders } };

  function withCsp(response: NextResponse): NextResponse {
    response.headers.set("Content-Security-Policy", csp);
    return response;
  }

  const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (!isAdminRoute || pathname === "/admin/login" || pathname === "/api/admin/login") {
    return withCsp(NextResponse.next(nextInit));
  }

  const token = request.cookies.get("ty_admin_session")?.value;
  const isAuthenticated = Boolean(token && verifySessionToken(token));

  if (!isAuthenticated) {
    if (pathname.startsWith("/api/admin")) {
      return withCsp(
        NextResponse.json(
          { error: { code: "UNAUTHORIZED", message: "Giriş yapmanız gerekiyor" } },
          { status: 401 }
        )
      );
    }
    return withCsp(NextResponse.redirect(new URL("/admin/login", request.url)));
  }

  return withCsp(NextResponse.next(nextInit));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|widget/).*)"],
};
