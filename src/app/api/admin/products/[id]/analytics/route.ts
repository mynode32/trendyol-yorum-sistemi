import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api/errors";
import { getCurrentUser } from "@/lib/auth/currentUser";

const DAY_MS = 24 * 60 * 60 * 1000;

function emptyRatingDistribution(): Record<string, number> {
  return { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) return jsonError("UNAUTHORIZED", "Giriş yapmanız gerekiyor", 401);

  const { id } = await params;
  const product = await prisma.product.findFirst({
    where: { id, accountId: currentUser.accountId },
    select: { id: true },
  });
  if (!product) return jsonError("NOT_FOUND", "Ürün bulunamadı", 404);

  const now = new Date();
  const last30 = new Date(now.getTime() - 30 * DAY_MS);
  const prior30Start = new Date(now.getTime() - 60 * DAY_MS);

  // bkz. /api/admin/analytics: aynı tanım — gizlenmiş yorumlar hariç, vitrin
  // kapasitesinden (isDisplayed) bağımsız gerçek yorum resmi.
  const baseWhere = { productId: id, isHidden: false };

  const [totalReviews, avgAgg, ratingGroups, recentAvgAgg, priorAvgAgg] = await Promise.all([
    prisma.review.count({ where: baseWhere }),
    prisma.review.aggregate({ where: baseWhere, _avg: { rating: true } }),
    prisma.review.groupBy({ by: ["rating"], where: baseWhere, _count: { rating: true } }),
    prisma.review.aggregate({
      where: { ...baseWhere, reviewDate: { gte: last30 } },
      _avg: { rating: true },
    }),
    prisma.review.aggregate({
      where: { ...baseWhere, reviewDate: { gte: prior30Start, lt: last30 } },
      _avg: { rating: true },
    }),
  ]);

  const ratingDistribution = emptyRatingDistribution();
  for (const group of ratingGroups) {
    ratingDistribution[String(group.rating)] = group._count.rating;
  }

  const recentAverage = recentAvgAgg._avg.rating;
  const priorAverage = priorAvgAgg._avg.rating;
  const averageRatingChange30d =
    recentAverage !== null && priorAverage !== null ? recentAverage - priorAverage : null;

  return NextResponse.json({
    totalReviews,
    averageRating: avgAgg._avg.rating,
    ratingDistribution,
    averageRatingChange30d,
  });
}
