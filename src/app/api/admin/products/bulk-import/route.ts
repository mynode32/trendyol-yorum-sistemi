import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api/errors";
import { discoverSellerProductIds } from "@/lib/scraper/trendyolClient";
import { getCurrentUser } from "@/lib/auth/currentUser";

function isTrendyolUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "trendyol.com" || hostname.endsWith(".trendyol.com");
  } catch {
    return false;
  }
}

const bodySchema = z.object({
  sellerUrl: z.string(),
  storeId: z.string().trim().min(1).max(100).optional(),
  minRating: z.number().int().min(1).max(5).optional(),
});

export async function POST(request: Request) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) return jsonError("UNAUTHORIZED", "Giriş yapmanız gerekiyor", 401);

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError("INVALID_BODY", "Geçersiz JSON gövdesi", 400);
  }

  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success || !isTrendyolUrl(parsed.data.sellerUrl)) {
    return jsonError("INVALID_URL", "Geçerli bir trendyol.com mağaza URL'si girin", 400);
  }
  const { sellerUrl, storeId, minRating } = parsed.data;

  let discoveredIds: string[];
  try {
    discoveredIds = await discoverSellerProductIds(sellerUrl);
  } catch {
    return jsonError(
      "SELLER_FETCH_FAILED",
      "Mağaza sayfası taranamadı. Worker'ın (bu bilgisayarın) çalışır durumda olduğundan emin olun.",
      502
    );
  }

  const existing = discoveredIds.length
    ? await prisma.product.findMany({
        where: { trendyolProductId: { in: discoveredIds } },
        select: { trendyolProductId: true },
      })
    : [];
  const existingIds = new Set(existing.map((p) => p.trendyolProductId));
  const newIds = discoveredIds.filter((id) => !existingIds.has(id));

  if (newIds.length > 0) {
    await prisma.product.createMany({
      data: newIds.map((id) => ({
        accountId: currentUser.accountId,
        trendyolProductId: id,
        trendyolUrl: `https://www.trendyol.com/urun-p-${id}`,
        name: `Ürün ${id}`,
        ...(storeId ? { storeId } : {}),
        ...(minRating !== undefined ? { minRating } : {}),
      })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({
    discovered: discoveredIds.length,
    added: newIds.length,
    skipped: discoveredIds.length - newIds.length,
    addedIds: newIds,
  });
}
