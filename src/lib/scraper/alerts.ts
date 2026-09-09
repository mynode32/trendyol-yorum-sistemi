import type { ScheduledScrapeSummary } from "./scheduler";

/**
 * Sağlayıcı bağımsız hata bildirimi. SCRAPE_ALERT_WEBHOOK_URL tanımlanırsa worker,
 * başarısız ürün içeren her koşu sonunda bu JSON'u POST eder. URL tanımlı değilse
 * alarm özelliği sessizce devre dışıdır; scraping akışı bundan etkilenmez.
 */
export async function notifyScrapeFailure(summary: ScheduledScrapeSummary): Promise<void> {
  const webhookUrl = process.env.SCRAPE_ALERT_WEBHOOK_URL;
  if (!webhookUrl || summary.failed === 0) return;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "scrape.failed",
        occurredAt: new Date().toISOString(),
        ...summary,
      }),
    });
    if (!response.ok) {
      console.error(`[scheduler] Alarm webhook'u ${response.status} döndü.`);
    }
  } catch (error) {
    // Bildirim altyapısının arızası, tarama sonucunu veya worker'ın doğru exit
    // code'unu gizlememelidir.
    console.error("[scheduler] Alarm webhook'una ulaşılamadı:", error);
  }
}
