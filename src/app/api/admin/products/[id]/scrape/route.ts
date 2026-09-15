import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api/errors";
import {
  ScrapeConcurrencyLimitError,
  ScrapeInProgressError,
  ScrapeQuotaExceededError,
  scrapeProduct,
} from "@/lib/scraper/persist";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { requireSameOrigin } from "@/lib/api/csrf";
import { PRODUCT_MANAGERS, requireRole } from "@/lib/auth/authorization";
import { writeAuditLog } from "@/lib/audit/log";

export const runtime = "nodejs";
// Self-hosted worker'larda uzun ürün listeleri için gereklidir. Hosting sağlayıcısının
// kendi istek zaman aşımı daha düşükse bu endpoint yerine worker komutu kullanılmalıdır.
export const maxDuration = 300;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) return jsonError("UNAUTHORIZED", "Giriş yapmanız gerekiyor", 401);

  const authorizationError = requireRole(currentUser, PRODUCT_MANAGERS);
  if (authorizationError) return authorizationError;

  const csrfError = requireSameOrigin(request);
  if (csrfError) return csrfError;

  const { id } = await params;
  const product = await prisma.product.findFirst({
    where: { id, accountId: currentUser.accountId },
    select: { id: true },
  });
  if (!product) return jsonError("NOT_FOUND", "Ürün bulunamadı", 404);

  await writeAuditLog({
    accountId: currentUser.accountId,
    actorUserId: currentUser.userId,
    action: "SCRAPE_REQUESTED",
    targetType: "product",
    targetId: id,
  });

  let result;
  try {
    result = await scrapeProduct(id);
  } catch (error) {
    if (error instanceof ScrapeInProgressError) {
      return jsonError("SCRAPE_IN_PROGRESS", "Bu ürün için zaten devam eden bir tarama var", 409);
    }
    if (error instanceof ScrapeConcurrencyLimitError) {
      return jsonError("SCRAPE_CONCURRENCY_LIMIT", error.message, 429);
    }
    if (error instanceof ScrapeQuotaExceededError) {
      return jsonError("SCRAPE_QUOTA_EXCEEDED", error.message, 429);
    }
    throw error;
  }
  if (result.status === "failed") {
    return jsonError("SCRAPE_FAILED", "Tarama başarısız oldu. Ayrıntılar scraper kayıtlarında.", 502);
  }

  return NextResponse.json(result);
}
