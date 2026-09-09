import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api/errors";

function isTrendyolUrl(trendyolUrl: string): boolean {
  try {
    const { hostname } = new URL(trendyolUrl);
    return hostname === "trendyol.com" || hostname.endsWith(".trendyol.com");
  } catch {
    return false;
  }
}

function extractProductId(trendyolUrl: string): string | null {
  const match = trendyolUrl.match(/-p-(\d+)/);
  return match ? match[1] : null;
}

export async function GET() {
  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ data: products });
}

export async function POST(request: Request) {
  const { trendyolUrl } = await request.json();

  if (!trendyolUrl || !isTrendyolUrl(trendyolUrl)) {
    return jsonError("INVALID_URL", "Geçerli bir trendyol.com ürün URL'si girin", 400);
  }

  const trendyolProductId = extractProductId(trendyolUrl);
  if (!trendyolProductId) {
    return jsonError("INVALID_URL", "Ürün ID'si URL'den çıkarılamadı", 400);
  }

  try {
    const product = await prisma.product.create({
      data: {
        trendyolProductId,
        trendyolUrl,
        name: `Ürün ${trendyolProductId}`,
      },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("CONFLICT", "Bu ürün zaten ekli", 409);
    }
    throw error;
  }
}
