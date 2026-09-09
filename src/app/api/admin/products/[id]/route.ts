import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api/errors";

const patchBodySchema = z
  .object({
    isTracked: z.boolean().optional(),
    minRating: z.number().int().min(1).max(5).nullable().optional(),
  })
  .refine((data) => data.isTracked !== undefined || data.minRating !== undefined, {
    message: "isTracked veya minRating alanlarından en az biri gönderilmeli",
  });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
      "isTracked boolean, minRating 1-5 arası bir tam sayı ya da null olmalı",
      400
    );
  }
  const { isTracked, minRating } = parsed.data;

  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(isTracked !== undefined ? { isTracked } : {}),
        ...(minRating !== undefined ? { minRating } : {}),
      },
    });
    return NextResponse.json(product);
  } catch {
    // Prisma bilinmeyen id için P2025 fırlatır; 500 yerine 404 dönüyoruz.
    return jsonError("NOT_FOUND", "Ürün bulunamadı", 404);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.$transaction([
      prisma.scrapeLog.deleteMany({ where: { productId: id } }),
      prisma.review.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch {
    // Prisma bilinmeyen id için P2025 fırlatır; 500 yerine 404 dönüyoruz.
    return jsonError("NOT_FOUND", "Ürün bulunamadı", 404);
  }
}
