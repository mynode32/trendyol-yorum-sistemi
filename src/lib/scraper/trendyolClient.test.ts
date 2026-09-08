import { describe, it, expect, vi } from "vitest";
import { fetchAllReviewsWithFetcher } from "./trendyolClient";

describe("fetchAllReviewsWithFetcher", () => {
  it("paginates using result.summary.totalPages, then stops (real last page is not empty)", async () => {
    const page0 = {
      isSuccess: true,
      result: {
        summary: { totalPages: 2 },
        reviews: [
          { id: 1, rate: 5, comment: "Harika", userFullName: "A", likesCount: 0, createdAt: 1700000000000, mediaFiles: [] },
        ],
      },
    };
    const page1 = {
      isSuccess: true,
      result: {
        summary: { totalPages: 2 },
        reviews: [
          { id: 2, rate: 4, comment: "İyi", userFullName: "B", likesCount: 1, createdAt: 1700000100000, mediaFiles: [] },
        ],
      },
    };

    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ status: 200, body: JSON.stringify(page0) })
      .mockResolvedValueOnce({ status: 200, body: JSON.stringify(page1) });

    const reviews = await fetchAllReviewsWithFetcher("1071760667", fetchPage);

    expect(reviews).toHaveLength(2);
    expect(reviews[0].trendyolReviewId).toBe("1");
    expect(reviews[1].trendyolReviewId).toBe("2");
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("retries with backoff on 429, then succeeds", async () => {
    const okPage = {
      isSuccess: true,
      result: {
        summary: { totalPages: 1 },
        reviews: [
          { id: 2, rate: 4, comment: "İyi", userFullName: "B", likesCount: 0, createdAt: 1700000000000, mediaFiles: [] },
        ],
      },
    };

    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ status: 429, body: "rate limited" })
      .mockResolvedValueOnce({ status: 200, body: JSON.stringify(okPage) });

    const reviews = await fetchAllReviewsWithFetcher("1071760667", fetchPage);

    expect(reviews).toHaveLength(1);
    expect(reviews[0].trendyolReviewId).toBe("2");
  }, 10000);

  it("falls back to stopping on an empty page if totalPages is ever missing", async () => {
    const pageNoSummary = {
      isSuccess: true,
      result: { reviews: [] },
    };

    const fetchPage = vi.fn().mockResolvedValueOnce({ status: 200, body: JSON.stringify(pageNoSummary) });

    const reviews = await fetchAllReviewsWithFetcher("1071760667", fetchPage);

    expect(reviews).toHaveLength(0);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
