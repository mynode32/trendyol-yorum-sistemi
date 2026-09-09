import cron from "node-cron";
import { runScheduledScrape } from "../src/lib/scraper/scheduler";

// Her 3 saatte bir çalışır (spec: "sık güncelleme", 2-4 saat aralığı)
cron.schedule("0 */3 * * *", async () => {
  console.log(`[scheduler] Zamanlı tarama başlıyor: ${new Date().toISOString()}`);
  const summary = await runScheduledScrape();
  console.log(`[scheduler] Zamanlı tarama bitti: ${new Date().toISOString()} — ${summary.succeeded}/${summary.attempted} başarılı, ${summary.failed} başarısız.`);
});

console.log("[scheduler] Cron zamanlayıcı başlatıldı (her 3 saatte bir).");
