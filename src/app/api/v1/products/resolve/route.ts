import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CORS_HEADERS } from "@/lib/api/cors";
import { jsonError } from "@/lib/api/errors";

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// Widget'ın tek bir site-geneli script'ten (İdeaSoft "Ürün Takip Kodu" gibi)
// çalışabilmesi için: host sayfa hangi ürünü görüntülüyorsa, o platformun
// kendi ürün koduyla (data-external-ref) bizim internal Product.id'mizi bulur.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ref = url.searchParams.get("ref");
  const storeId = url.searchParams.get("storeId");

  if (!ref) {
    return jsonError("INVALID_QUERY", "ref parametresi zorunlu", 400, CORS_HEADERS);
  }

  const product = await prisma.product.findUnique({ where: { externalRef: ref } });
  // externalRef zaten benzersiz olduğu için tek başına asla yanlış ürünü döndürmez;
  // ama ürünün kendi storeId'si ayarlanmışsa, isteğin storeId'sinin de eşleşmesini
  // zorunlu kılıyoruz — script'in yanlış müşterinin sitesine yapıştırılması gibi bir
  // operatör hatasında başka bir mağazanın yorumunun sızmasını engeller.
  if (!product || (product.storeId && product.storeId !== storeId)) {
    return jsonError("PRODUCT_NOT_FOUND", "Bu koda eşleşen ürün bulunamadı", 404, CORS_HEADERS);
  }

  return NextResponse.json({ id: product.id }, { headers: CORS_HEADERS });
}
