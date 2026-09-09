import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api/errors";
import { scrapeProduct } from "@/lib/scraper/persist";

export const runtime = "nodejs";
// Self-hosted worker'larda uzun ürün listeleri için gereklidir. Hosting sağlayıcısının
// kendi istek zaman aşımı daha düşükse bu endpoint yerine worker komutu kullanılmalıdır.
export const maxDuration = 300;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!product) return jsonError("NOT_FOUND", "Ürün bulunamadı", 404);

  const result = await scrapeProduct(id);
  if (result.status === "failed") {
    return jsonError("SCRAPE_FAILED", "Tarama başarısız oldu. Ayrıntılar scraper kayıtlarında.", 502);
  }

  return NextResponse.json(result);
}
