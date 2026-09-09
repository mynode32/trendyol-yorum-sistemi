import { prisma } from "@/lib/db";
import { fetchAllReviews } from "./trendyolClient";

const UPDATE_BATCH_SIZE = 25;

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

export async function scrapeProduct(
  productId: string
): Promise<{ status: "success" | "failed"; newReviews: number }> {
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  const startedAt = new Date();

  try {
    const reviews = await fetchAllReviews(product.trendyolProductId);
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

    await prisma.product.update({
      where: { id: product.id },
      data: { lastScrapedAt: new Date() },
    });

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
}
