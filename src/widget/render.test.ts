// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderReviewWidget } from "./render";

describe("renderReviewWidget", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("fetches summary and reviews, then renders average rating and review items", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/summary")) {
          return Promise.resolve(
            new Response(JSON.stringify({ averageRating: 4.5, totalReviews: 2, ratingCounts: { "1": 0, "2": 0, "3": 0, "4": 1, "5": 1 } }))
          );
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                { id: "1", rating: 5, comment: "Harika ürün", authorName: "A", hasPhoto: false, reviewDate: "2026-01-01" },
              ],
              pagination: { page: 1, pageSize: 20, total: 1 },
            })
          )
        );
      })
    );

    const container = document.createElement("div");
    document.body.appendChild(container);

    await renderReviewWidget(container, { apiBaseUrl: "http://localhost", productId: "prod-1" });

    expect(container.textContent).toContain("4.5");
    expect(container.textContent).toContain("Harika ürün");
  });

  it("escapes HTML in review author/comment to prevent XSS", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/summary")) {
          return Promise.resolve(
            new Response(JSON.stringify({ averageRating: 5, totalReviews: 1, ratingCounts: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 1 } }))
          );
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "1",
                  rating: 5,
                  comment: "<img src=x onerror=alert(1)>",
                  authorName: "<script>alert('x')</script>",
                  hasPhoto: false,
                  reviewDate: "2026-01-01",
                },
              ],
              pagination: { page: 1, pageSize: 20, total: 1 },
            })
          )
        );
      })
    );

    const container = document.createElement("div");
    document.body.appendChild(container);

    await renderReviewWidget(container, { apiBaseUrl: "http://localhost", productId: "prod-1" });

    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.innerHTML).toContain("&lt;script&gt;");
  });
});
