import type { Prisma } from "@prisma/client";
import { z } from "zod";

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

/** Query parametresi doğrulaması başarısız olduğunda fırlatılır; API katmanı bunu 400'e çevirir. */
export class InvalidQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidQueryError";
  }
}

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

const positiveIntSchema = z.coerce.number().int().min(1);
const starSchema = z.coerce.number().int().min(1).max(5);
const sortSchema = z.enum(["newest", "oldest", "mostHelpful", "longest"]);
const hasPhotoSchema = z.enum(["true", "false"]);
const searchSchema = z.string().trim().max(200);
const dateSchema = z
  .string()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), "geçerli bir tarih değil");

export function parseReviewQuery(searchParams: URLSearchParams): ReviewQuery {
  const issues: string[] = [];

  function validate<T>(field: string, raw: string, schema: z.ZodType<T>): T | undefined {
    const result = schema.safeParse(raw);
    if (!result.success) {
      issues.push(`${field}: geçersiz değer "${raw}"`);
      return undefined;
    }
    return result.data;
  }

  const pageParam = searchParams.get("page");
  const page = pageParam === null ? 1 : validate("page", pageParam, positiveIntSchema) ?? 1;

  const pageSizeParam = searchParams.get("pageSize");
  const requestedPageSize =
    pageSizeParam === null
      ? DEFAULT_PAGE_SIZE
      : validate("pageSize", pageSizeParam, positiveIntSchema) ?? DEFAULT_PAGE_SIZE;
  // pageSize üst sınırı belgelenmiş bir tavan (spec bölüm 6), hata değil: kırpılır.
  const pageSize = Math.min(MAX_PAGE_SIZE, requestedPageSize);

  const starsParam = searchParams.get("stars");
  let stars: number[] | undefined;
  if (starsParam) {
    const parsed = starsParam
      .split(",")
      .map((value) => validate("stars", value.trim(), starSchema));
    stars = parsed.every((n) => n !== undefined) ? (parsed as number[]) : undefined;
  }

  const dateFromParam = searchParams.get("dateFrom");
  const dateFromValue =
    dateFromParam === null ? undefined : validate("dateFrom", dateFromParam, dateSchema);

  const dateToParam = searchParams.get("dateTo");
  const dateToValue =
    dateToParam === null ? undefined : validate("dateTo", dateToParam, dateSchema);

  const sortParam = searchParams.get("sort");
  const sort: ReviewSort =
    sortParam === null ? "newest" : validate("sort", sortParam, sortSchema) ?? "newest";

  const hasPhotoParam = searchParams.get("hasPhoto");
  const hasPhoto =
    hasPhotoParam === null ? undefined : validate("hasPhoto", hasPhotoParam, hasPhotoSchema);
  const qParam = searchParams.get("q");
  const q = qParam === null ? undefined : validate("q", qParam, searchSchema);

  if (dateFromValue && dateToValue && new Date(dateFromValue) > new Date(dateToValue)) {
    issues.push("dateFrom, dateTo'dan sonra olamaz");
  }

  if (issues.length > 0) {
    throw new InvalidQueryError(issues.join("; "));
  }

  return {
    stars: stars && stars.length > 0 ? stars : undefined,
    dateFrom: dateFromValue ? new Date(dateFromValue) : undefined,
    dateTo: dateToValue ? new Date(dateToValue) : undefined,
    hasPhoto: hasPhoto === "true" ? true : hasPhoto === "false" ? false : undefined,
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
    isDisplayed: true,
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
      return { commentLength: "desc" };
    case "newest":
    default:
      return { reviewDate: "desc" };
  }
}
