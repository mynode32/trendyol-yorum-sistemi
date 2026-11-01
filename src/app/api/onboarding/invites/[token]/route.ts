import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api/errors";
import { requireSameOrigin } from "@/lib/api/csrf";
import { hashPassword, PASSWORD_MIN_LENGTH } from "@/lib/auth/password";
import { createSessionToken, MAX_SESSION_AGE_MS } from "@/lib/auth/session";
import { hashInviteToken, isInviteUsable } from "@/lib/onboarding/invites";

const NO_STORE = { "Cache-Control": "no-store" };
const bodySchema = z.object({ password: z.string().min(PASSWORD_MIN_LENGTH).max(1024) });

async function findUsableInvite(token: string) {
  const invite = await prisma.signupInvite.findUnique({ where: { tokenHash: hashInviteToken(token) } });
  return invite && isInviteUsable(invite) ? invite : null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await findUsableInvite(token);
  if (!invite) return jsonError("INVITE_NOT_FOUND", "Bu davet geçersiz veya süresi dolmuş.", 404, NO_STORE);

  return NextResponse.json(
    { email: invite.email, accountName: invite.accountName, plan: invite.plan },
    { headers: NO_STORE }
  );
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const csrfError = requireSameOrigin(request);
  if (csrfError) return csrfError;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError("INVALID_BODY", "Geçersiz JSON gövdesi", 400, NO_STORE);
  }
  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonError("INVALID_BODY", `Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalı.`, 400, NO_STORE);
  }

  const { token } = await params;
  const tokenHash = hashInviteToken(token);
  const passwordHash = await hashPassword(parsed.data.password);
  const now = new Date();

  let result: { userId: string; sessionVersion: number } | null;
  try {
    result = await prisma.$transaction(async (tx) => {
      const invite = await tx.signupInvite.findUnique({ where: { tokenHash } });
      if (!invite || !isInviteUsable(invite, now)) return null;

      // acceptedAt kontrolü, aynı linkin iki kez eşzamanlı kullanılmasında yalnız
      // bir isteğin hesabı oluşturabilmesini sağlar.
      const claimed = await tx.signupInvite.updateMany({
        where: { id: invite.id, acceptedAt: null, expiresAt: { gt: now } },
        data: { acceptedAt: now },
      });
      if (claimed.count !== 1) return null;

      const account = await tx.account.create({ data: { name: invite.accountName, plan: invite.plan } });
      const user = await tx.user.create({
        data: { accountId: account.id, email: invite.email, passwordHash, role: "OWNER" },
      });
      return { userId: user.id, sessionVersion: user.sessionVersion };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("EMAIL_IN_USE", "Bu email ile zaten bir hesap bulunuyor.", 409, NO_STORE);
    }
    throw error;
  }

  if (!result) return jsonError("INVITE_NOT_FOUND", "Bu davet geçersiz veya daha önce kullanılmış.", 404, NO_STORE);

  const response = NextResponse.json({ ok: true }, { status: 201, headers: NO_STORE });
  response.cookies.set("ty_admin_session", createSessionToken(result.userId, result.sessionVersion), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    priority: "high",
    path: "/",
    maxAge: MAX_SESSION_AGE_MS / 1000,
  });
  return response;
}
