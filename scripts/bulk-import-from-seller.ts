import { prisma } from "../src/lib/db";
import { discoverSellerProductIds } from "../src/lib/scraper/trendyolClient";

async function main() {
  const accountEmail = process.argv[2];
  const sellerUrl = process.argv[3];
  const storeId = process.argv[4] || undefined;
  const minRating = process.argv[5] ? Number(process.argv[5]) : undefined;

  if (!accountEmail || !sellerUrl) {
    console.error(
      "Kullanım: npm run bulk-import -- <hesap-email> <mağazaUrl> [mağazaEtiketi] [minPuan]"
    );
    process.exit(1);
  }

  const account = await prisma.user.findUnique({ where: { email: accountEmail } });
  if (!account) {
    console.error(`"${accountEmail}" email'ine sahip bir kullanıcı bulunamadı.`);
    process.exit(1);
  }

  const discoveredIds = await discoverSellerProductIds(sellerUrl);
  console.log(`${discoveredIds.length} ürün bulundu.`);

  const existing = discoveredIds.length
    ? await prisma.product.findMany({
        where: { trendyolProductId: { in: discoveredIds } },
        select: { trendyolProductId: true },
      })
    : [];
  const existingIds = new Set(existing.map((p) => p.trendyolProductId));
  const newIds = discoveredIds.filter((id) => !existingIds.has(id));

  if (newIds.length > 0) {
    await prisma.product.createMany({
      data: newIds.map((id) => ({
        accountId: account.accountId,
        trendyolProductId: id,
        trendyolUrl: `https://www.trendyol.com/urun-p-${id}`,
        name: `Ürün ${id}`,
        ...(storeId ? { storeId } : {}),
        ...(minRating !== undefined ? { minRating } : {}),
      })),
      skipDuplicates: true,
    });
  }

  console.log(`${newIds.length} yeni ürün eklendi, ${discoveredIds.length - newIds.length} zaten ekliydi.`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
