import { prisma } from "../src/lib/db";

async function main() {
  const products = await prisma.product.findMany({
    where: { isTracked: true },
    select: { id: true, name: true, lastScrapedAt: true },
    orderBy: { lastScrapedAt: "desc" },
  });
  const since = new Date(Date.now() - 30 * 60 * 1000);
  const recentlyScraped = products.filter((p) => p.lastScrapedAt && p.lastScrapedAt > since);
  console.log(`Toplam takip edilen: ${products.length}`);
  console.log(`Son 30 dakikada taranan: ${recentlyScraped.length}`);
  console.log("En son taranan 5:");
  for (const p of products.slice(0, 5)) {
    console.log(`  ${p.lastScrapedAt?.toISOString() ?? "hiç"} - ${p.name}`);
  }
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
