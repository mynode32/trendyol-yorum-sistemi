import { prisma } from "@/lib/db";

/**
 * Bir ürünün yorumlarını gösterirken hangi ürün ID'lerinin havuzlanacağını belirler.
 * reviewGroupId boşsa ürün tek başınadır. Doluysa, aynı reviewGroupId + aynı storeId'yi
 * paylaşan tüm ürünler havuzlanır — storeId eşleşmesi, farklı müşterilerin
 * ürünlerinin yanlışlıkla aynı seriye alınıp yorumlarının karışmasını engeller.
 */
export async function resolveDisplayProductIds(product: {
  id: string;
  reviewGroupId: string | null;
  storeId: string | null;
}): Promise<string[]> {
  if (!product.reviewGroupId) {
    return [product.id];
  }

  const siblings = await prisma.product.findMany({
    where: { reviewGroupId: product.reviewGroupId, storeId: product.storeId },
    select: { id: true },
  });
  return siblings.map((p) => p.id);
}
