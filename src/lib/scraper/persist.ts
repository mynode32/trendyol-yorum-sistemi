import { prisma } from "@/lib/db";
import { fetchAllReviews, fetchProductInfo } from "./trendyolClient";
import { syncDisplayedReviews } from "./displaySync";
import type { Product } from "@prisma/client";

const UPDATE_BATCH_SIZE = 25;
const SCRAPE_LOCK_MAX_AGE_MS = 15 * 60 * 1000;

export class ScrapeInProgressError extends Error {
  constructor() {
    super("Bu ürün için zaten devam eden bir tarama var");
    this.name = "ScrapeInProgressError";
  }
}

async function acquireScrapeLock(productId: string): Promise<Date> {
  const lockedAt = new Date();
  const staleBefore = new Date(lockedAt.getTime() - SCRAPE_LOCK_MAX_AGE_MS);
  const result = await prisma.product.updateMany({
    where: {
      id: productId,
      OR: [{ scrapeLockedAt: null }, { scrapeLockedAt: { lt: staleBefore } }],
    },
    data: { scrapeLockedAt: lockedAt },
  });
  if (result.count !== 1) throw new ScrapeInProgressError();
  return lockedAt;
}

async function releaseScrapeLock(productId: string, lockedAt: Date): Promise<void> {
  // Eski bir worker, süresi dolmuş kilidi devralan yeni worker'ın kilidini
  // kaldıramasın diye tam kendi timestamp'i üzerinden bırakıyoruz.
  await prisma.product.updateMany({
    where: { id: productId, scrapeLockedAt: lockedAt },
    data: { scrapeLockedAt: null },
  });
}

type StoredReviewData = {
  productId: string;
  trendyolReviewId: string;
  rating: number;
  comment: string;
  commentLength: number;
  authorName: string;
  hasPhoto: boolean;
  photoUrls: string[];
  reviewDate: Date;
  helpfulCount: number;
};

async function updateExistingReviews(reviews: StoredReviewData[], existingIds: Set<string>): Promise<void> {
  const existingReviews = reviews.filter((review) => existingIds.has(review.trendyolReviewId));

  // Büyük ürünlerde binlerce eşzamanlı sorgu açmamak için güncellemeleri küçük
  // gruplar halinde yapıyoruz. Moderasyon alanları (isHidden/isApproved) özellikle
  // güncellenmez; admin kararları scraper tarafından geri alınmamalıdır.
  for (let index = 0; index < existingReviews.length; index += UPDATE_BATCH_SIZE) {
    await Promise.all(
      existingReviews.slice(index, index + UPDATE_BATCH_SIZE).map((review) =>
        prisma.review.update({
          where: { trendyolReviewId: review.trendyolReviewId },
          data: {
            rating: review.rating,
            comment: review.comment,
            commentLength: review.commentLength,
            authorName: review.authorName,
            hasPhoto: review.hasPhoto,
            photoUrls: review.photoUrls,
            reviewDate: review.reviewDate,
            helpfulCount: review.helpfulCount,
          },
        })
      )
    );
  }
}

/** Ürün adı/görseli henüz bilinmiyorsa (imageUrl null) bir kereye mahsus çeker.
 * Başarısız olursa taramayı bozmaz — mevcut ad/görsel korunur, sonraki taramada tekrar denenir. */
async function fetchProductNameAndImage(
  product: Product
): Promise<{ name?: string; imageUrl?: string }> {
  if (product.imageUrl != null) return {};
  try {
    const info = await fetchProductInfo(product.trendyolUrl);
    return {
      ...(info.name ? { name: info.name } : {}),
      ...(info.imageUrl ? { imageUrl: info.imageUrl } : {}),
    };
  } catch (error) {
    console.error(`[scraper] Ürün ${product.id} için ad/görsel çekilemedi:`, error);
    return {};
  }
}

export async function scrapeProduct(
  productId: string
): Promise<{ status: "success" | "failed"; newReviews: number }> {
  const lockedAt = await acquireScrapeLock(productId);

  try {
    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    const startedAt = new Date();

    try {
    const fetchedReviews = await fetchAllReviews(product.trendyolProductId);
    // minRating ayarlanmışsa bu eşiğin altındaki yorumlar hiç depolanmaz.
    const reviews =
      product.minRating != null
        ? fetchedReviews.filter((review) => review.rating >= product.minRating!)
        : fetchedReviews;
    const reviewData: StoredReviewData[] = reviews.map((review) => ({
      productId: product.id,
      trendyolReviewId: review.trendyolReviewId,
      rating: review.rating,
      comment: review.comment,
      commentLength: review.comment.length,
      authorName: review.authorName,
      hasPhoto: review.hasPhoto,
      photoUrls: review.photoUrls,
      reviewDate: review.reviewDate,
      helpfulCount: review.helpfulCount,
    }));

    const existing = reviewData.length
      ? await prisma.review.findMany({
          where: { trendyolReviewId: { in: reviewData.map((review) => review.trendyolReviewId) } },
          select: { trendyolReviewId: true },
        })
      : [];
    const existingIds = new Set(existing.map((review) => review.trendyolReviewId));

    const created = await prisma.review.createMany({
      data: reviewData,
      skipDuplicates: true,
    });
    await updateExistingReviews(reviewData, existingIds);
    const newCount = created.count;

    const productInfo = await fetchProductNameAndImage(product);
    await prisma.product.update({
      where: { id: product.id },
      data: { lastScrapedAt: new Date(), ...productInfo },
    });
    await syncDisplayedReviews(product.id);

    await prisma.scrapeLog.create({
      data: {
        productId: product.id,
        startedAt,
        finishedAt: new Date(),
        status: "success",
        newReviews: newCount,
      },
    });

    return { status: "success", newReviews: newCount };
    } catch (error) {
      await prisma.scrapeLog.create({
        data: {
          productId: product.id,
          startedAt,
          finishedAt: new Date(),
          status: "failed",
          newReviews: 0,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });

      return { status: "failed", newReviews: 0 };
    }
  } finally {
    await releaseScrapeLock(productId, lockedAt);
  }
}
