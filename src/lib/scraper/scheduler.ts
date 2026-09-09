import { prisma } from "@/lib/db";
import { scrapeProduct } from "./persist";
import { notifyScrapeFailure } from "./alerts";

export type ScheduledScrapeSummary = {
  attempted: number;
  succeeded: number;
  failed: number;
  newReviews: number;
};

function randomInterProductDelay(): Promise<void> {
  const ms = Math.floor(Math.random() * 2000) + 1000;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runScheduledScrape(): Promise<ScheduledScrapeSummary> {
  const trackedProducts = await prisma.product.findMany({ where: { isTracked: true } });
  const summary: ScheduledScrapeSummary = {
    attempted: trackedProducts.length,
    succeeded: 0,
    failed: 0,
    newReviews: 0,
  };

  for (const [index, product] of trackedProducts.entries()) {
    try {
      const result = await scrapeProduct(product.id);
      if (result.status === "success") {
        summary.succeeded += 1;
        summary.newReviews += result.newReviews;
      } else {
        summary.failed += 1;
      }
    } catch (error) {
      summary.failed += 1;
      console.error(`[scheduler] Ürün ${product.id} taraması başarısız:`, error);
    }
    // Son üründen sonra gereksiz bekleme yapma; özellikle tek seferlik worker'ın
    // tamamlanma durumunu mümkün olan en kısa sürede bildirmesi gerekir.
    if (index < trackedProducts.length - 1) await randomInterProductDelay();
  }

  await notifyScrapeFailure(summary);
  return summary;
}
