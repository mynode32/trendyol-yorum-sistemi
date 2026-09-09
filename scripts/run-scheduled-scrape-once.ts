import { prisma } from "../src/lib/db";
import { runScheduledScrape } from "../src/lib/scraper/scheduler";

// GitHub Actions cron workflow'u tarafından çağrılır: node-cron ile beklemek yerine
// tek seferlik çalışıp çıkar — zamanlamayı GitHub Actions'ın kendi cron'u yapar.
runScheduledScrape()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
