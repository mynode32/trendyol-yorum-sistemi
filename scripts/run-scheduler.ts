import cron from "node-cron";
import { runScheduledScrape } from "../src/lib/scraper/scheduler";

// Haftada bir çalışır (Pazartesi 03:00) — worker kapasitesini birden fazla
// hesabın ürünlerini taramaya yetecek şekilde korumak için 3 saatlik aralıktan
// düşürüldü.
cron.schedule("0 3 * * 1", async () => {
  console.log(`[scheduler] Zamanlı tarama başlıyor: ${new Date().toISOString()}`);
  const summary = await runScheduledScrape();
  console.log(`[scheduler] Zamanlı tarama bitti: ${new Date().toISOString()} — ${summary.succeeded}/${summary.attempted} başarılı, ${summary.failed} başarısız.`);
});

console.log("[scheduler] Cron zamanlayıcı başlatıldı (haftada bir, Pazartesi 03:00).");
