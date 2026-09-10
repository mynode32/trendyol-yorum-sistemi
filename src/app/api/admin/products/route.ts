import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api/errors";

function isTrendyolUrl(trendyolUrl: string): boolean {
  try {
    const { hostname } = new URL(trendyolUrl);
    return hostname === "trendyol.com" || hostname.endsWith(".trendyol.com");
  } catch {
    return false;
  }
}

function extractProductId(trendyolUrl: string): string | null {
  const match = trendyolUrl.match(/-p-(\d+)/);
  return match ? match[1] : null;
}

const minRatingSchema = z.number().int().min(1).max(5).optional();

export async function GET() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { reviews: { where: { isDisplayed: true } } } } },
  });
  const data = products.map(({ _count, ...product }) => ({
    ...product,
    displayedReviewCount: _count.reviews,
  }));
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const { trendyolUrl, minRating: rawMinRating } = await request.json();

  if (!trendyolUrl || !isTrendyolUrl(trendyolUrl)) {
    return jsonError("INVALID_URL", "Geçerli bir trendyol.com ürün URL'si girin", 400);
  }

  const trendyolProductId = extractProductId(trendyolUrl);
  if (!trendyolProductId) {
    return jsonError("INVALID_URL", "Ürün ID'si URL'den çıkarılamadı", 400);
  }

  const minRatingResult = minRatingSchema.safeParse(rawMinRating ?? undefined);
  if (!minRatingResult.success) {
    return jsonError("INVALID_BODY", "minRating 1 ile 5 arasında bir tam sayı olmalı", 400);
  }

  try {
    const product = await prisma.product.create({
      data: {
        trendyolProductId,
        trendyolUrl,
        name: `Ürün ${trendyolProductId}`,
        minRating: minRatingResult.data ?? null,
      },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("CONFLICT", "Bu ürün zaten ekli", 409);
    }
    throw error;
  }
}
