import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api/errors";
import { getCurrentUser } from "@/lib/auth/currentUser";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) return jsonError("UNAUTHORIZED", "Giriş yapmanız gerekiyor", 401);

  const { id } = await params;

  const owned = await prisma.product.findFirst({
    where: { id, accountId: currentUser.accountId },
    select: { id: true },
  });
  if (!owned) return jsonError("NOT_FOUND", "Ürün bulunamadı", 404);

  const url = new URL(request.url);

  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(url.searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE)
  );

  const search = url.searchParams.get("search")?.trim();
  const ratingParam = Number(url.searchParams.get("rating"));
  const rating = Number.isInteger(ratingParam) && ratingParam >= 1 && ratingParam <= 5 ? ratingParam : undefined;

  const where = {
    productId: id,
    ...(rating ? { rating } : {}),
    ...(search
      ? {
          OR: [
            { comment: { contains: search, mode: "insensitive" as const } },
            { authorName: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { reviewDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.review.count({ where }),
  ]);

  return NextResponse.json({ data, pagination: { page, pageSize, total } });
}
