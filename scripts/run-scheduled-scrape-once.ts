import { prisma } from "../src/lib/db";
import { runScheduledScrape } from "../src/lib/scraper/scheduler";

// Worker makinesindeki Windows Görev Zamanlayıcı ("TrendyolYorumScraper" görevi,
// bkz. scripts/run-scheduled-scrape-prod.ps1) tarafından çağrılır: node-cron ile
// beklemek yerine tek seferlik çalışıp çıkar — zamanlamayı Görev Zamanlayıcı yapar.
runScheduledScrape()
  .then(async (summary) => {
    console.log(`[scheduler] Tamamlandı: ${summary.succeeded}/${summary.attempted} başarılı, ${summary.failed} başarısız, ${summary.newReviews} yeni yorum.`);
    await prisma.$disconnect();
    // CI/worker başarısız görünsün ki izleme sistemi sessiz veri bayatlamasını
    // "başarılı" bir çalıştırma sanmasın.
    if (summary.failed > 0) process.exitCode = 1;
  })
  .catch((error) => {
    console.error(error);
    prisma.$disconnect().finally(() => {
      process.exitCode = 1;
    });
  });
