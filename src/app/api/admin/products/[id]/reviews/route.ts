import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api/errors";
import { getCurrentUser } from "@/lib/auth/currentUser";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const MAX_PAGE = 1000;

function parseBoundedPositiveInt(value: string | null, fallback: number, max: number): number {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 ? Math.min(parsed, max) : fallback;
}

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

  const page = parseBoundedPositiveInt(url.searchParams.get("page"), 1, MAX_PAGE);
  const pageSize = parseBoundedPositiveInt(
    url.searchParams.get("pageSize"),
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE
  );

  const search = url.searchParams.get("search")?.trim().slice(0, 200);
  const ratingParam = Number(url.searchParams.get("rating"));
  const rating = Number.isInteger(ratingParam) && ratingParam >= 1 && ratingParam <= 5 ? ratingParam : undefined;

  // PostgreSQL'in varsayılan (Türkçe olmayan) kolasyonu, İ/i çiftini ILIKE
  // ile her zaman eşleştirmez. Türkçe büyük harf varyantını da arayarak admin
  // aramasının hem yorumda hem isimde tutarlı kalmasını sağlıyoruz.
  const searchVariants = search ? [...new Set([search, search.toLocaleUpperCase("tr-TR")])] : [];

  const where = {
    productId: id,
    ...(rating ? { rating } : {}),
    ...(searchVariants.length > 0
      ? {
          OR: searchVariants.flatMap((term) => [
            { comment: { contains: term, mode: "insensitive" as const } },
            { authorName: { contains: term, mode: "insensitive" as const } },
          ]),
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
