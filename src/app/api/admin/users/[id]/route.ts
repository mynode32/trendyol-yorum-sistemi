import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api/errors";
import { getCurrentUser } from "@/lib/auth/currentUser";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) return jsonError("UNAUTHORIZED", "Giriş yapmanız gerekiyor", 401);

  const { id } = await params;

  if (id === currentUser.userId) {
    return jsonError("CANNOT_REMOVE_SELF", "Kendi hesabınızı buradan silemezsiniz", 400);
  }

  const target = await prisma.user.findFirst({
    where: { id, accountId: currentUser.accountId },
    select: { id: true },
  });
  if (!target) return jsonError("NOT_FOUND", "Kullanıcı bulunamadı", 404);

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return jsonError("NOT_FOUND", "Kullanıcı bulunamadı", 404);
    }
    throw error;
  }
}
