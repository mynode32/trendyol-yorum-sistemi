import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CORS_HEADERS } from "@/lib/api/cors";
import { jsonError } from "@/lib/api/errors";
import {
  parseReviewQuery,
  buildReviewWhere,
  buildReviewOrderBy,
  InvalidQueryError,
} from "@/lib/reviews/filters";

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return jsonError("PRODUCT_NOT_FOUND", "Ürün bulunamadı", 404, CORS_HEADERS);
  }

  const url = new URL(request.url);
  let query;
  try {
    query = parseReviewQuery(url.searchParams);
  } catch (error) {
    if (error instanceof InvalidQueryError) {
      return jsonError("INVALID_QUERY", error.message, 400, CORS_HEADERS);
    }
    throw error;
  }
  const where = buildReviewWhere(id, query);

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: buildReviewOrderBy(query),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.review.count({ where }),
  ]);

  const data =
    query.sort === "longest"
      ? [...reviews].sort((a, b) => b.comment.length - a.comment.length)
      : reviews;

  return NextResponse.json(
    {
      data,
      pagination: { page: query.page, pageSize: query.pageSize, total },
    },
    { headers: CORS_HEADERS }
  );
}
