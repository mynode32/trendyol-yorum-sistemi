import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api/errors";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { hashPassword, PASSWORD_MIN_LENGTH, verifyPassword } from "@/lib/auth/password";
import { requireSameOrigin } from "@/lib/api/csrf";
import { createSessionToken, MAX_SESSION_AGE_MS } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/log";

export async function GET(request: Request) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) return jsonError("UNAUTHORIZED", "Giriş yapmanız gerekiyor", 401);

  return NextResponse.json({
    email: currentUser.email,
    accountName: currentUser.accountName,
    accountPlan: currentUser.accountPlan,
    role: currentUser.role,
  });
}

const passwordBodySchema = z.object({
  currentPassword: z.string().min(1).max(1024),
  newPassword: z.string().min(PASSWORD_MIN_LENGTH).max(1024),
});

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) return jsonError("UNAUTHORIZED", "Giriş yapmanız gerekiyor", 401);

  const csrfError = requireSameOrigin(request);
  if (csrfError) return csrfError;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError("INVALID_BODY", "Geçersiz JSON gövdesi", 400);
  }
  const parsed = passwordBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonError("INVALID_BODY", `Yeni şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalı`, 400);
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: currentUser.userId } });
  const currentPasswordValid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!currentPasswordValid) {
    return jsonError("INVALID_CREDENTIALS", "Mevcut şifre hatalı", 401);
  }

  const updatedUser = await prisma.user.update({
    where: { id: currentUser.userId },
    data: {
      passwordHash: await hashPassword(parsed.data.newPassword),
      sessionVersion: { increment: 1 },
    },
  });

  // Mevcut kullanıcının oturumunu yeni sürümle yenilerken, diğer tüm eski
  // cookie'ler sessionVersion kontrolüyle geçersiz kalır.
  const response = NextResponse.json({ ok: true });
  response.cookies.set("ty_admin_session", createSessionToken(updatedUser.id, updatedUser.sessionVersion), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    priority: "high",
    path: "/",
    maxAge: MAX_SESSION_AGE_MS / 1000,
  });
  await writeAuditLog({
    accountId: currentUser.accountId,
    actorUserId: currentUser.userId,
    action: "PASSWORD_CHANGED",
    targetType: "user",
    targetId: currentUser.userId,
  });
  return response;
}
