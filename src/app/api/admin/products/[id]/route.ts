import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { isTracked } = await request.json();

  const product = await prisma.product.update({
    where: { id },
    data: { isTracked },
  });

  return NextResponse.json(product);
}
