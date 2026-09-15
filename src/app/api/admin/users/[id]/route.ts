import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api/errors";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { requireSameOrigin } from "@/lib/api/csrf";
import { requireRole } from "@/lib/auth/authorization";
import { writeAuditLog } from "@/lib/audit/log";
import { z } from "zod";

const roleBodySchema = z.object({ role: z.enum(["OWNER", "ADMIN", "VIEWER"]) });

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) return jsonError("UNAUTHORIZED", "Giriş yapmanız gerekiyor", 401);

  const authorizationError = requireRole(currentUser, ["OWNER"]);
  if (authorizationError) return authorizationError;

  const csrfError = requireSameOrigin(request);
  if (csrfError) return csrfError;

  const { id } = await params;

  if (id === currentUser.userId) {
    return jsonError("CANNOT_REMOVE_SELF", "Kendi hesabınızı buradan silemezsiniz", 400);
  }

  const target = await prisma.user.findFirst({
    where: { id, accountId: currentUser.accountId },
    select: { id: true, email: true, role: true },
  });
  if (!target) return jsonError("NOT_FOUND", "Kullanıcı bulunamadı", 404);

  if (target.role === "OWNER") {
    const ownerCount = await prisma.user.count({ where: { accountId: currentUser.accountId, role: "OWNER" } });
    if (ownerCount <= 1) return jsonError("CANNOT_REMOVE_LAST_OWNER", "Son hesap sahibi silinemez", 400);
  }

  try {
    await prisma.user.delete({ where: { id } });
    await writeAuditLog({
      accountId: currentUser.accountId,
      actorUserId: currentUser.userId,
      action: "USER_DELETED",
      targetType: "user",
      targetId: id,
      metadata: { email: target.email, role: target.role },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return jsonError("NOT_FOUND", "Kullanıcı bulunamadı", 404);
    }
    throw error;
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) return jsonError("UNAUTHORIZED", "Giriş yapmanız gerekiyor", 401);

  const authorizationError = requireRole(currentUser, ["OWNER"]);
  if (authorizationError) return authorizationError;

  const csrfError = requireSameOrigin(request);
  if (csrfError) return csrfError;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError("INVALID_BODY", "Geçersiz JSON gövdesi", 400);
  }
  const parsed = roleBodySchema.safeParse(rawBody);
  if (!parsed.success) return jsonError("INVALID_BODY", "Geçerli bir rol gönderin", 400);

  const { id } = await params;
  const target = await prisma.user.findFirst({
    where: { id, accountId: currentUser.accountId },
    select: { id: true, role: true },
  });
  if (!target) return jsonError("NOT_FOUND", "Kullanıcı bulunamadı", 404);

  if (target.role === "OWNER" && parsed.data.role !== "OWNER") {
    const ownerCount = await prisma.user.count({ where: { accountId: currentUser.accountId, role: "OWNER" } });
    if (ownerCount <= 1) return jsonError("CANNOT_REMOVE_LAST_OWNER", "Son hesap sahibi rolü değiştirilemez", 400);
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role: parsed.data.role, sessionVersion: { increment: 1 } },
    select: { id: true, email: true, role: true, createdAt: true },
  });
  await writeAuditLog({
    accountId: currentUser.accountId,
    actorUserId: currentUser.userId,
    action: "USER_ROLE_CHANGED",
    targetType: "user",
    targetId: id,
    metadata: { from: target.role, to: user.role },
  });
  return NextResponse.json(user);
}
