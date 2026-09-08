import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api/errors";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { isHidden } = await request.json();

  try {
    const review = await prisma.review.update({
      where: { id },
      data: { isHidden },
    });
    return NextResponse.json(review);
  } catch {
    // Prisma bilinmeyen id için P2025 fırlatır; 500 yerine 404 dönüyoruz.
    return jsonError("NOT_FOUND", "Yorum bulunamadı", 404);
  }
}
