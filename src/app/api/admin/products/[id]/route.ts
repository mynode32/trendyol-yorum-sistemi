import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api/errors";
import { syncDisplayedReviews } from "@/lib/scraper/displaySync";
import { getCurrentUser } from "@/lib/auth/currentUser";

const patchBodySchema = z
  .object({
    isTracked: z.boolean().optional(),
    minRating: z.number().int().min(1).max(5).nullable().optional(),
    maxDisplayedReviews: z.number().int().min(1).max(500).optional(),
    externalRef: z.string().trim().min(1).max(200).nullable().optional(),
    storeId: z.string().trim().min(1).max(100).nullable().optional(),
    reviewGroupId: z.string().trim().min(1).max(200).nullable().optional(),
  })
  .refine(
    (data) =>
      data.isTracked !== undefined ||
      data.minRating !== undefined ||
      data.maxDisplayedReviews !== undefined ||
      data.externalRef !== undefined ||
      data.storeId !== undefined ||
      data.reviewGroupId !== undefined,
    {
      message:
        "isTracked, minRating, maxDisplayedReviews, externalRef, storeId veya reviewGroupId alanlarından en az biri gönderilmeli",
    }
  );

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) return jsonError("UNAUTHORIZED", "Giriş yapmanız gerekiyor", 401);

  const { id } = await params;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError("INVALID_BODY", "Geçersiz JSON gövdesi", 400);
  }

  const parsed = patchBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonError(
      "INVALID_BODY",
      "isTracked boolean, minRating 1-5 arası bir tam sayı/null, maxDisplayedReviews 1-500 arası bir tam sayı, externalRef boş olmayan bir metin/null olmalı",
      400
    );
  }
  const { isTracked, minRating, maxDisplayedReviews, externalRef, storeId, reviewGroupId } = parsed.data;

  const owned = await prisma.product.findFirst({
    where: { id, accountId: currentUser.accountId },
    select: { id: true },
  });
  if (!owned) return jsonError("NOT_FOUND", "Ürün bulunamadı", 404);

  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(isTracked !== undefined ? { isTracked } : {}),
        ...(minRating !== undefined ? { minRating } : {}),
        ...(maxDisplayedReviews !== undefined ? { maxDisplayedReviews } : {}),
        ...(externalRef !== undefined ? { externalRef } : {}),
        ...(storeId !== undefined ? { storeId } : {}),
        ...(reviewGroupId !== undefined ? { reviewGroupId } : {}),
      },
    });
    // Vitrin boyutu değiştiyse yeni sınıra göre hemen yeniden hesapla.
    if (maxDisplayedReviews !== undefined) await syncDisplayedReviews(id);
    return NextResponse.json(product);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return jsonError("CONFLICT", "Bu externalRef başka bir ürün tarafından kullanılıyor", 409);
      }
      if (error.code === "P2025") {
        return jsonError("NOT_FOUND", "Ürün bulunamadı", 404);
      }
    }
    throw error;
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) return jsonError("UNAUTHORIZED", "Giriş yapmanız gerekiyor", 401);

  const { id } = await params;

  const owned = await prisma.product.findFirst({
    where: { id, accountId: currentUser.accountId },
    select: { id: true },
  });
  if (!owned) return jsonError("NOT_FOUND", "Ürün bulunamadı", 404);

  try {
    await prisma.$transaction([
      prisma.scrapeLog.deleteMany({ where: { productId: id } }),
      prisma.review.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return jsonError("NOT_FOUND", "Ürün bulunamadı", 404);
    }
    throw error;
  }
}
