import { prisma } from "@/lib/db";
import { fetchAllReviews } from "./trendyolClient";

export async function scrapeProduct(
  productId: string
): Promise<{ status: "success" | "failed"; newReviews: number }> {
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  const startedAt = new Date();

  try {
    const reviews = await fetchAllReviews(product.trendyolProductId);

    let newCount = 0;
    for (const review of reviews) {
      const created = await prisma.review.createMany({
        data: [
          {
            productId: product.id,
            trendyolReviewId: review.trendyolReviewId,
            rating: review.rating,
            comment: review.comment,
            authorName: review.authorName,
            hasPhoto: review.hasPhoto,
            photoUrls: review.photoUrls,
            reviewDate: review.reviewDate,
            helpfulCount: review.helpfulCount,
          },
        ],
        skipDuplicates: true,
      });
      newCount += created.count;
    }

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
