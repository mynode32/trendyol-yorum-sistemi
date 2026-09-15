import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api/errors";
import { syncDisplayedReviews } from "@/lib/scraper/displaySync";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { requireSameOrigin } from "@/lib/api/csrf";
import { PRODUCT_MANAGERS, requireRole } from "@/lib/auth/authorization";
import { writeAuditLog } from "@/lib/audit/log";

const patchBodySchema = z.object({ isHidden: z.boolean() });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) return jsonError("UNAUTHORIZED", "Giriş yapmanız gerekiyor", 401);

  const authorizationError = requireRole(currentUser, PRODUCT_MANAGERS);
  if (authorizationError) return authorizationError;

  const csrfError = requireSameOrigin(request);
  if (csrfError) return csrfError;

  const { id } = await params;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError("INVALID_BODY", "Geçersiz JSON gövdesi", 400);
  }

  const parsed = patchBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonError("INVALID_BODY", "isHidden alanı boolean olmalı", 400);
  }
  const { isHidden } = parsed.data;

  const owned = await prisma.review.findFirst({
    where: { id, product: { accountId: currentUser.accountId } },
    select: { id: true },
  });
  if (!owned) return jsonError("NOT_FOUND", "Yorum bulunamadı", 404);

  try {
    const review = await prisma.review.update({
      where: { id },
      data: { isHidden },
    });
    // Gizleme/gösterme kararı vitrindeki N yorumu değiştirebilir: bir yorum
    // gizlenince sıradaki uygun yorum onun yerini almalı.
    await syncDisplayedReviews(review.productId);
    await writeAuditLog({
      accountId: currentUser.accountId,
      actorUserId: currentUser.userId,
      action: "REVIEW_VISIBILITY_CHANGED",
      targetType: "review",
      targetId: review.id,
      metadata: { isHidden },
    });
    return NextResponse.json(review);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return jsonError("NOT_FOUND", "Yorum bulunamadı", 404);
    }
    throw error;
  }
}
