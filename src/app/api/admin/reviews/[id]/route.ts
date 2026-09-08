import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { isHidden } = await request.json();

  const review = await prisma.review.update({
    where: { id },
    data: { isHidden },
  });

  return NextResponse.json(review);
}
