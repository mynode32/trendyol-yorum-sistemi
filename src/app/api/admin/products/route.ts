import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

  const trendyolProductId = trendyolUrl ? extractProductId(trendyolUrl) : null;
  if (!trendyolProductId) {
    return NextResponse.json(
      { error: { code: "INVALID_URL", message: "Ürün ID'si URL'den çıkarılamadı" } },
      { status: 400 }
    );
  }

  const product = await prisma.product.create({
    data: {
      trendyolProductId,
      trendyolUrl,
      name: `Ürün ${trendyolProductId}`,
    },
  });

  return NextResponse.json(product, { status: 201 });
}
