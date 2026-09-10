import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CORS_HEADERS } from "@/lib/api/cors";
import { jsonError } from "@/lib/api/errors";

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return jsonError("PRODUCT_NOT_FOUND", "Ürün bulunamadı", 404, CORS_HEADERS);
  }

  const baseWhere = { productId: id, isApproved: true, isHidden: false, isDisplayed: true };

  const grouped = await prisma.review.groupBy({
    by: ["rating"],
    where: baseWhere,
    _count: { rating: true },
  });

  const ratingCounts: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  let totalReviews = 0;
  let ratingSum = 0;

  for (const group of grouped) {
    ratingCounts[String(group.rating)] = group._count.rating;
    totalReviews += group._count.rating;
    ratingSum += group.rating * group._count.rating;
  }

  return NextResponse.json(
    {
      averageRating: totalReviews > 0 ? ratingSum / totalReviews : 0,
      totalReviews,
      ratingCounts,
    },
    { headers: CORS_HEADERS }
  );
}
