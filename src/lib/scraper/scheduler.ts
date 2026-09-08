import { prisma } from "@/lib/db";
import { scrapeProduct } from "./persist";

function randomInterProductDelay(): Promise<void> {
  const ms = Math.floor(Math.random() * 2000) + 1000;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runScheduledScrape(): Promise<void> {
  const trackedProducts = await prisma.product.findMany({ where: { isTracked: true } });

  for (const product of trackedProducts) {
    try {
      await scrapeProduct(product.id);
    } catch (error) {
      console.error(`[scheduler] Ürün ${product.id} taraması başarısız:`, error);
    }
    await randomInterProductDelay();
  }
}
