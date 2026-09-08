import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api/errors";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { isTracked } = await request.json();

  try {
    const product = await prisma.product.update({
      where: { id },
      data: { isTracked },
    });
    return NextResponse.json(product);
  } catch {
    // Prisma bilinmeyen id için P2025 fırlatır; 500 yerine 404 dönüyoruz.
    return jsonError("NOT_FOUND", "Ürün bulunamadı", 404);
  }
}
