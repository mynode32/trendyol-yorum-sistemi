import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

/** Yöneticiye açık, izleme sistemlerinin de oturumla çağırabileceği durum özeti. */
export async function GET() {
  try {
    const [trackedProducts, lastLog] = await Promise.all([
      prisma.product.findMany({
        where: { isTracked: true },
        select: { id: true, lastScrapedAt: true },
      }),
      prisma.scrapeLog.findFirst({
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
