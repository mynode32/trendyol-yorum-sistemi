import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api/errors";
import { getCurrentUser } from "@/lib/auth/currentUser";

const WEEKS_FOR_VOLUME = 8;
const MIN_REVIEWS_FOR_RANKING = 3;
const TOP_N = 5;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function emptyRatingDistribution(): Record<string, number> {
  return { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
}

export async function GET(request: Request) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) return jsonError("UNAUTHORIZED", "Giriş yapmanız gerekiyor", 401);

  const accountId = currentUser.accountId;
  const now = new Date();
  const last7 = new Date(now.getTime() - 7 * DAY_MS);
  const last30 = new Date(now.getTime() - 30 * DAY_MS);
  const prior30Start = new Date(now.getTime() - 60 * DAY_MS);
  const volumeSince = new Date(now.getTime() - WEEKS_FOR_VOLUME * WEEK_MS);

  // isHidden:false — moderasyonla gizlenen yorumlar analiz dışı bırakılır.
  // Widget'ta gösterilecek üst sınır (isDisplayed/maxDisplayedReviews) burada
  // uygulanmaz: analytics, ürünün gerçek yorum resmini yansıtmalı, vitrin
  // kapasitesini değil.
  const baseWhere = { isHidden: false, product: { accountId } };

  const [
    totalReviews,
    avgAgg,
    ratingGroups,
    newReviewsLast7Days,
    newReviewsLast30Days,
    recentAvgAgg,
    priorAvgAgg,
    topProductsByCountRaw,
    productRatingGroups,
    volumeRows,
  ] = await Promise.all([
    prisma.review.count({ where: baseWhere }),
    prisma.review.aggregate({ where: baseWhere, _avg: { rating: true } }),
    prisma.review.groupBy({ by: ["rating"], where: baseWhere, _count: { rating: true } }),
    prisma.review.count({ where: { ...baseWhere, createdAt: { gte: last7 } } }),
    prisma.review.count({ where: { ...baseWhere, createdAt: { gte: last30 } } }),
    prisma.review.aggregate({
      where: { ...baseWhere, reviewDate: { gte: last30 } },
      _avg: { rating: true },
    }),
    prisma.review.aggregate({
      where: { ...baseWhere, reviewDate: { gte: prior30Start, lt: last30 } },
      _avg: { rating: true },
    }),
    prisma.review.groupBy({
      by: ["productId"],
      where: baseWhere,
      _count: { productId: true },
      orderBy: { _count: { productId: "desc" } },
      take: TOP_N,
    }),
    prisma.review.groupBy({
      by: ["productId"],
      where: baseWhere,
      _avg: { rating: true },
      _count: { productId: true },
    }),
    prisma.review.findMany({
      where: { ...baseWhere, reviewDate: { gte: volumeSince } },
      select: { reviewDate: true },
    }),
  ]);

  const ratingDistribution = emptyRatingDistribution();
  for (const group of ratingGroups) {
    ratingDistribution[String(group.rating)] = group._count.rating;
  }

  const productIds = new Set<string>([
    ...topProductsByCountRaw.map((p) => p.productId),
    ...productRatingGroups.map((p) => p.productId),
  ]);
  const products = productIds.size
    ? await prisma.product.findMany({
        where: { id: { in: [...productIds] } },
        select: { id: true, name: true },
      })
    : [];
  const productNames = new Map(products.map((p) => [p.id, p.name]));

  const topProductsByReviewCount = topProductsByCountRaw.map((p) => ({
    id: p.productId,
    name: productNames.get(p.productId) ?? "Bilinmeyen ürün",
    reviewCount: p._count.productId,
  }));

  const rankable = productRatingGroups
    .filter((p) => p._count.productId >= MIN_REVIEWS_FOR_RANKING)
    .map((p) => ({
      id: p.productId,
      name: productNames.get(p.productId) ?? "Bilinmeyen ürün",
      averageRating: p._avg.rating ?? 0,
      reviewCount: p._count.productId,
    }));
  const topRatedProducts = [...rankable].sort((a, b) => b.averageRating - a.averageRating).slice(0, TOP_N);
  const bottomRatedProducts = [...rankable]
    .sort((a, b) => a.averageRating - b.averageRating)
    .slice(0, TOP_N);

  // Haftalık kova: tarama artık haftada bir çalıştığından günlük kırılım
  // yapay tepe/sıfır desenleri üretir — haftalık daha doğru bir resim verir.
  const weeklyVolume = Array.from({ length: WEEKS_FOR_VOLUME }, (_, i) => {
    const weeksAgo = WEEKS_FOR_VOLUME - 1 - i;
    const weekStart = new Date(now.getTime() - (weeksAgo + 1) * WEEK_MS);
    const weekEnd = new Date(now.getTime() - weeksAgo * WEEK_MS);
    const count = volumeRows.filter(
      (r) => r.reviewDate >= weekStart && r.reviewDate < weekEnd
    ).length;
    return { weekStart: weekStart.toISOString(), count };
  });

  const averageRating = avgAgg._avg.rating;
  const recentAverage = recentAvgAgg._avg.rating;
  const priorAverage = priorAvgAgg._avg.rating;
  const averageRatingChange30d =
    recentAverage !== null && priorAverage !== null ? recentAverage - priorAverage : null;

  return NextResponse.json({
    summary: {
      totalReviews,
      averageRating,
      ratingDistribution,
      newReviewsLast7Days,
      newReviewsLast30Days,
      averageRatingChange30d,
    },
    weeklyVolume,
    topProductsByReviewCount,
    topRatedProducts,
    bottomRatedProducts,
  });
}
