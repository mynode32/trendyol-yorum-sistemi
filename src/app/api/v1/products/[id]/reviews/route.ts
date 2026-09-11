import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CORS_HEADERS } from "@/lib/api/cors";
import { PUBLIC_REVIEW_API_HEADERS } from "@/lib/api/cache";
import { jsonError } from "@/lib/api/errors";
import {
  parseReviewQuery,
  buildReviewWhere,
  buildReviewOrderBy,
  InvalidQueryError,
} from "@/lib/reviews/filters";
import { resolveDisplayProductIds } from "@/lib/reviews/group";

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
    return jsonError("PRODUCT_NOT_FOUND", "Ürün bulunamadı", 404, PUBLIC_REVIEW_API_HEADERS);
  }

  const url = new URL(request.url);
  let query;
  try {
    query = parseReviewQuery(url.searchParams);
  } catch (error) {
    if (error instanceof InvalidQueryError) {
      return jsonError("INVALID_QUERY", error.message, 400, PUBLIC_REVIEW_API_HEADERS);
    }
    throw error;
  }
  const productIds = await resolveDisplayProductIds(product);
  const where = buildReviewWhere(productIds, query);

  const skip = (query.page - 1) * query.pageSize;

  const [data, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: buildReviewOrderBy(query),
      skip,
      take: query.pageSize,
    }),
    prisma.review.count({ where }),
  ]);

  return NextResponse.json(
    {
      data,
      pagination: { page: query.page, pageSize: query.pageSize, total },
    },
    { headers: PUBLIC_REVIEW_API_HEADERS }
  );
}
