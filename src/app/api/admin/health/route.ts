import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api/errors";
import { getCurrentUser } from "@/lib/auth/currentUser";

// Tarama artık haftada bir çalışıyor (bkz. scripts/run-scheduler.ts); eşik,
// bir çalıştırmanın gecikmesine tolerans tanımak için 7 günden biraz fazla.
const STALE_AFTER_MS = 8 * 24 * 60 * 60 * 1000;

/** Her hesabın yalnızca kendi tarama durumunu görebildiği izleme özeti. */
export async function GET(request: Request) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) return jsonError("UNAUTHORIZED", "Giriş yapmanız gerekiyor", 401);

  try {
    const [trackedProducts, lastLog] = await Promise.all([
      prisma.product.findMany({
        where: { isTracked: true, accountId: currentUser.accountId },
        select: { id: true, lastScrapedAt: true },
      }),
      prisma.scrapeLog.findFirst({
        where: { product: { accountId: currentUser.accountId } },
        orderBy: { startedAt: "desc" },
        select: { status: true, startedAt: true, errorMessage: true },
      }),
    ]);
    const threshold = Date.now() - STALE_AFTER_MS;
    const staleProductCount = trackedProducts.filter(
      (product) => !product.lastScrapedAt || product.lastScrapedAt.getTime() < threshold
    ).length;
    const healthy = staleProductCount === 0 && lastLog?.status !== "failed";

    return NextResponse.json(
      {
        status: healthy ? "ok" : "degraded",
        trackedProductCount: trackedProducts.length,
        staleProductCount,
        staleAfterHours: STALE_AFTER_MS / (60 * 60 * 1000),
        lastScrape: lastLog
          ? { status: lastLog.status, startedAt: lastLog.startedAt, hasError: Boolean(lastLog.errorMessage) }
          : null,
      },
      { status: healthy ? 200 : 503 }
    );
  } catch {
    return NextResponse.json({ status: "down", error: "DATABASE_UNAVAILABLE" }, { status: 503 });
  }
}
