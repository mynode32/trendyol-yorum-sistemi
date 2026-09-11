import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api/errors";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export async function GET(request: Request) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) return jsonError("UNAUTHORIZED", "Giriş yapmanız gerekiyor", 401);

  return NextResponse.json({
    email: currentUser.email,
    accountName: currentUser.accountName,
  });
}

const passwordBodySchema = z.object({
  currentPassword: z.string().min(1).max(1024),
  newPassword: z.string().min(8).max(1024),
});

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) return jsonError("UNAUTHORIZED", "Giriş yapmanız gerekiyor", 401);

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError("INVALID_BODY", "Geçersiz JSON gövdesi", 400);
  }
  const parsed = passwordBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonError("INVALID_BODY", "Yeni şifre en az 8 karakter olmalı", 400);
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: currentUser.userId } });
  const currentPasswordValid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!currentPasswordValid) {
    return jsonError("INVALID_CREDENTIALS", "Mevcut şifre hatalı", 401);
  }

  await prisma.user.update({
    where: { id: currentUser.userId },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });

  return NextResponse.json({ ok: true });
}
