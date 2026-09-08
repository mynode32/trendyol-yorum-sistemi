import type { Prisma } from "@prisma/client";

export type ReviewSort = "newest" | "oldest" | "mostHelpful" | "longest";

export type ReviewQuery = {
  stars?: number[];
  dateFrom?: Date;
  dateTo?: Date;
  hasPhoto?: boolean;
  q?: string;
  sort: ReviewSort;
  page: number;
  pageSize: number;
};

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

export function parseReviewQuery(searchParams: URLSearchParams): ReviewQuery {
  const starsParam = searchParams.get("stars");
  const stars = starsParam
    ? starsParam.split(",").map((s) => Number(s.trim())).filter((n) => n >= 1 && n <= 5)
    : undefined;

  const dateFromParam = searchParams.get("dateFrom");
  const dateToParam = searchParams.get("dateTo");
  const hasPhotoParam = searchParams.get("hasPhoto");
  const q = searchParams.get("q") ?? undefined;
  const sort = (searchParams.get("sort") as ReviewSort | null) ?? "newest";

  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE)))
  );

  return {
    stars: stars && stars.length > 0 ? stars : undefined,
    dateFrom: dateFromParam ? new Date(dateFromParam) : undefined,
    dateTo: dateToParam ? new Date(dateToParam) : undefined,
    hasPhoto: hasPhotoParam === "true" ? true : hasPhotoParam === "false" ? false : undefined,
    q: q || undefined,
    sort,
    page,
    pageSize,
  };
}

export function buildReviewWhere(
  productId: string,
  query: ReviewQuery
): Prisma.ReviewWhereInput {
  const where: Prisma.ReviewWhereInput = {
    productId,
    isApproved: true,
    isHidden: false,
  };

  if (query.stars) {
    where.rating = { in: query.stars };
  }

  if (query.dateFrom || query.dateTo) {
    where.reviewDate = {
      ...(query.dateFrom ? { gte: query.dateFrom } : {}),
      ...(query.dateTo ? { lte: query.dateTo } : {}),
    };
  }

  if (query.hasPhoto !== undefined) {
    where.hasPhoto = query.hasPhoto;
  }

  if (query.q) {
    where.comment = { contains: query.q, mode: "insensitive" };
  }

  return where;
}

export function buildReviewOrderBy(
  query: ReviewQuery
): Prisma.ReviewOrderByWithRelationInput {
  switch (query.sort) {
    case "oldest":
      return { reviewDate: "asc" };
    case "mostHelpful":
      return { helpfulCount: "desc" };
    case "longest":
      return { comment: "desc" }; // uzunluk sıralaması API katmanında uygulanır, bkz. Task 9
    case "newest":
    default:
      return { reviewDate: "desc" };
  }
}
