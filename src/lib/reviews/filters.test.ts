import { describe, it, expect } from "vitest";
import {
  parseReviewQuery,
  buildReviewWhere,
  buildReviewOrderBy,
  InvalidQueryError,
  type ReviewSort,
} from "./filters";

describe("parseReviewQuery", () => {
  it("parses stars, date range, hasPhoto, q, sort, pagination with defaults", () => {
    const params = new URLSearchParams(
      "stars=4,5&dateFrom=2026-01-01&dateTo=2026-02-01&hasPhoto=true&q=kargo&sort=mostHelpful&page=2&pageSize=10"
    );
    const query = parseReviewQuery(params);

    expect(query.stars).toEqual([4, 5]);
    expect(query.dateFrom).toEqual(new Date("2026-01-01"));
    expect(query.dateTo).toEqual(new Date("2026-02-01"));
    expect(query.hasPhoto).toBe(true);
    expect(query.q).toBe("kargo");
    expect(query.sort).toBe("mostHelpful");
    expect(query.page).toBe(2);
    expect(query.pageSize).toBe(10);
  });

  it("applies defaults when params are missing", () => {
    const query = parseReviewQuery(new URLSearchParams(""));
    expect(query.stars).toBeUndefined();
    expect(query.sort).toBe("newest");
    expect(query.page).toBe(1);
    expect(query.pageSize).toBe(20);
  });

  it("caps pageSize at 100", () => {
    const query = parseReviewQuery(new URLSearchParams("pageSize=500"));
    expect(query.pageSize).toBe(100);
  });

  it.each([
    ["page=abc"],
    ["page=0"],
    ["page=1.5"],
    ["pageSize=abc"],
    ["pageSize=0"],
    ["dateFrom=not-a-date"],
    ["dateTo=2026-13-45"],
    ["stars=9,0"],
    ["stars=abc"],
    ["sort=random"],
    ["hasPhoto=yes"],
    ["dateFrom=2026-02-01&dateTo=2026-01-01"],
    [`q=${"a".repeat(201)}`],
  ])("throws InvalidQueryError for %s", (queryString) => {
    expect(() => parseReviewQuery(new URLSearchParams(queryString))).toThrow(InvalidQueryError);
  });

  it("reports every invalid parameter in one error message", () => {
    try {
      parseReviewQuery(new URLSearchParams("page=abc&sort=random"));
      throw new Error("beklenen hata fırlatılmadı");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidQueryError);
      expect((error as Error).message).toContain("page");
      expect((error as Error).message).toContain("sort");
    }
  });
});

describe("buildReviewWhere", () => {
  it("always restricts to approved and not-hidden reviews for a product", () => {
    const where = buildReviewWhere("prod-1", { sort: "newest", page: 1, pageSize: 20 });
    expect(where).toMatchObject({
      productId: "prod-1",
      isApproved: true,
      isHidden: false,
    });
  });

  it("adds stars, date range, hasPhoto, and text search filters when present", () => {
    const where = buildReviewWhere("prod-1", {
      stars: [4, 5],
      dateFrom: new Date("2026-01-01"),
      dateTo: new Date("2026-02-01"),
      hasPhoto: true,
      q: "kargo",
      sort: "newest",
      page: 1,
      pageSize: 20,
    });

    expect(where.rating).toEqual({ in: [4, 5] });
    expect(where.reviewDate).toEqual({ gte: new Date("2026-01-01"), lte: new Date("2026-02-01") });
    expect(where.hasPhoto).toBe(true);
    expect(where.comment).toEqual({ contains: "kargo", mode: "insensitive" });
  });
});

describe("buildReviewOrderBy", () => {
  it.each([
    ["newest", { reviewDate: "desc" }],
    ["oldest", { reviewDate: "asc" }],
    ["mostHelpful", { helpfulCount: "desc" }],
    ["longest", { commentLength: "desc" }],
  ])("maps sort=%s correctly", (sort, expected) => {
    const orderBy = buildReviewOrderBy({ sort: sort as ReviewSort, page: 1, pageSize: 20 });
    expect(orderBy).toEqual(expected);
  });
});
