import { prisma } from "../src/lib/db";
import { scrapeProduct } from "../src/lib/scraper/persist";

async function main() {
  const trendyolProductId = process.argv[2];
  const accountEmail = process.argv[3];
  if (!trendyolProductId || !accountEmail) {
    console.error("Kullanım: npm run scrape:once -- <trendyolProductId> <hesap-email>");
    process.exit(1);
  }

  const account = await prisma.user.findUnique({ where: { email: accountEmail } });
  if (!account) {
    console.error(`"${accountEmail}" email'ine sahip bir kullanıcı bulunamadı.`);
    process.exit(1);
  }

  const product = await prisma.product.upsert({
    where: { trendyolProductId },
    update: {},
    create: {
      accountId: account.accountId,
      trendyolProductId,
      trendyolUrl: `https://www.trendyol.com/urun-p-${trendyolProductId}`,
      name: `Ürün ${trendyolProductId}`,
    },
  });

  const result = await scrapeProduct(product.id);
  console.log(`Sonuç: ${result.status}, yeni yorum sayısı: ${result.newReviews}`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
