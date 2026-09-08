// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderReviewWidget } from "./render";

describe("renderReviewWidget", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it("renders filter controls (star checkboxes, date range, photo toggle, search, sort, pagination)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/summary")) {
          return Promise.resolve(new Response(JSON.stringify({ averageRating: 4.0, totalReviews: 1 })));
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [{ id: "1", rating: 4, comment: "İyi", authorName: "A", hasPhoto: false, reviewDate: "2026-01-01" }],
              pagination: { page: 1, pageSize: 20, total: 1 },
            })
          )
        );
      })
    );

    const container = document.createElement("div");
    document.body.appendChild(container);

    await renderReviewWidget(container, { apiBaseUrl: "http://localhost", productId: "prod-1" });

    expect(container.querySelectorAll("[data-star]").length).toBe(5);
    expect(container.querySelector('[data-field="dateFrom"]')).not.toBeNull();
    expect(container.querySelector('[data-field="dateTo"]')).not.toBeNull();
    expect(container.querySelector('[data-field="hasPhoto"]')).not.toBeNull();
    expect(container.querySelector('[data-field="q"]')).not.toBeNull();
    expect(container.querySelector('[data-field="sort"]')).not.toBeNull();
    expect(container.querySelector('[data-action="prev"]')).not.toBeNull();
    expect(container.querySelector('[data-action="next"]')).not.toBeNull();
  });

  it("re-fetches reviews with the correct query string when a star filter is toggled", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes("/summary")) {
        return Promise.resolve(new Response(JSON.stringify({ averageRating: 4.0, totalReviews: 1 })));
      }
      return Promise.resolve(
        new Response(JSON.stringify({ data: [], pagination: { page: 1, pageSize: 20, total: 0 } }))
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const container = document.createElement("div");
    document.body.appendChild(container);
    await renderReviewWidget(container, { apiBaseUrl: "http://localhost", productId: "prod-1" });

    fetchMock.mockClear();

    const star5 = container.querySelector<HTMLInputElement>('[data-star="5"]')!;
    star5.checked = true;
    star5.dispatchEvent(new Event("change"));

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/reviews");
    expect(calledUrl).toContain("stars=5");
  });

  it("resets to page 1 and re-fetches when the sort dropdown changes", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes("/summary")) {
        return Promise.resolve(new Response(JSON.stringify({ averageRating: 4.0, totalReviews: 1 })));
      }
      return Promise.resolve(
        new Response(JSON.stringify({ data: [], pagination: { page: 1, pageSize: 20, total: 0 } }))
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const container = document.createElement("div");
    document.body.appendChild(container);
    await renderReviewWidget(container, { apiBaseUrl: "http://localhost", productId: "prod-1" });

    fetchMock.mockClear();

    const sortSelect = container.querySelector<HTMLSelectElement>('[data-field="sort"]')!;
    sortSelect.value = "oldest";
    sortSelect.dispatchEvent(new Event("change"));

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("sort=oldest");
    expect(calledUrl).toContain("page=1");
  });

  it("fetches the next page and disables prev/next buttons at the boundaries", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes("/summary")) {
        return Promise.resolve(new Response(JSON.stringify({ averageRating: 4.0, totalReviews: 25 })));
      }
      return Promise.resolve(
        new Response(JSON.stringify({ data: [], pagination: { page: 1, pageSize: 20, total: 25 } }))
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const container = document.createElement("div");
    document.body.appendChild(container);
    await renderReviewWidget(container, { apiBaseUrl: "http://localhost", productId: "prod-1" });

    const prevBtn = container.querySelector<HTMLButtonElement>('[data-action="prev"]')!;
    const nextBtn = container.querySelector<HTMLButtonElement>('[data-action="next"]')!;
    expect(prevBtn.disabled).toBe(true);
    expect(nextBtn.disabled).toBe(false);

    fetchMock.mockClear();
    nextBtn.click();

    // Wait for the whole async chain (fetch → json → DOM update) to settle,
    // not just for fetch() to have been invoked.
    await vi.waitFor(() => {
      expect(prevBtn.disabled).toBe(false);
    });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("page=2");
    expect(nextBtn.disabled).toBe(true);
  });

  it("debounces the search input before re-fetching with the query text", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((url: string) => {
      if (url.includes("/summary")) {
        return Promise.resolve(new Response(JSON.stringify({ averageRating: 4.0, totalReviews: 1 })));
      }
      return Promise.resolve(
        new Response(JSON.stringify({ data: [], pagination: { page: 1, pageSize: 20, total: 0 } }))
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const container = document.createElement("div");
    document.body.appendChild(container);
    await renderReviewWidget(container, { apiBaseUrl: "http://localhost", productId: "prod-1" });

    fetchMock.mockClear();

    const searchInput = container.querySelector<HTMLInputElement>('[data-field="q"]')!;
    searchInput.value = "kargo";
    searchInput.dispatchEvent(new Event("input"));

    expect(fetchMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);

    expect(fetchMock).toHaveBeenCalled();
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("q=kargo");
  });
});
