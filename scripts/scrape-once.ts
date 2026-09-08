import { prisma } from "../src/lib/db";
import { scrapeProduct } from "../src/lib/scraper/persist";

async function main() {
  const trendyolProductId = process.argv[2];
  if (!trendyolProductId) {
    console.error("Kullanım: npm run scrape:once -- <trendyolProductId>");
    process.exit(1);
  }

  const product = await prisma.product.upsert({
    where: { trendyolProductId },
    update: {},
    create: {
      trendyolProductId,
      trendyolUrl: `https://www.trendyol.com/p/${trendyolProductId}`,
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
