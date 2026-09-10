import { prisma } from "@/lib/db";

/**
 * Ürünün vitrininde (public API + widget) en fazla `maxDisplayedReviews` kadar,
 * en yeni onaylı/gizli-olmayan yorum görünür. Yeni uygun bir yorum eklendiğinde
 * en eskisi otomatik olarak vitrinden düşer. Admin panelindeki tüm yorumlar bu
 * fonksiyondan etkilenmez, sadece isDisplayed bayrağı güncellenir.
 */
export async function syncDisplayedReviews(productId: string): Promise<void> {
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });

  const eligible = await prisma.review.findMany({
    where: { productId, isApproved: true, isHidden: false },
    orderBy: { reviewDate: "desc" },
    take: product.maxDisplayedReviews,
    select: { id: true },
  });
  const displayedIds = eligible.map((review) => review.id);

  await prisma.$transaction([
    prisma.review.updateMany({
      where: { productId, id: { notIn: displayedIds } },
      data: { isDisplayed: false },
    }),
    prisma.review.updateMany({
      where: { productId, id: { in: displayedIds } },
      data: { isDisplayed: true },
    }),
  ]);
}
