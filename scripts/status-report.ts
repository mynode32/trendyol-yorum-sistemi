import { prisma } from "../src/lib/db";

async function main() {
  const all = await prisma.product.findMany({
    select: { id: true, name: true, storeId: true, externalRef: true, isTracked: true, lastScrapedAt: true },
  });

  const enwood = all.filter((p) => p.storeId === "enwood");
  const matched = enwood.filter((p) => p.externalRef);
  const unmatched = enwood.filter((p) => !p.externalRef);
  const scraped = enwood.filter((p) => p.lastScrapedAt);
  const notScrapedYet = enwood.filter((p) => !p.lastScrapedAt);

  console.log(`TOPLAM ürün (tüm mağazalar): ${all.length}`);
  console.log(`Enwood ürünleri: ${enwood.length}`);
  console.log(`  - Eşleşmiş (site stok kodu var): ${matched.length}`);
  console.log(`  - Eşleşmemiş (bilinçli atlandı): ${unmatched.length}`);
  console.log(`  - Taranmış (en az bir kez): ${scraped.length}`);
  console.log(`  - Henüz taranmamış: ${notScrapedYet.length}`);
  console.log(`\nHenüz taranmamış eşleşmiş ürünler (${matched.filter(p => !p.lastScrapedAt).length}):`);
  for (const p of matched.filter((p) => !p.lastScrapedAt)) {
    console.log(`  - ${p.name}`);
  }
  console.log(`\nEşleşmemiş (atlanan) ürünler (${unmatched.length}):`);
  for (const p of unmatched) {
    console.log(`  - ${p.name}`);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
