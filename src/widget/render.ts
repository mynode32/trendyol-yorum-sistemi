type WidgetOptions = { apiBaseUrl: string; productId: string; accentColor?: string };

type Summary = {
  averageRating: number;
  totalReviews: number;
  ratingCounts?: Record<string, number>;
};
type ReviewItem = {
  id: string;
  rating: number;
  comment: string;
  authorName: string;
  hasPhoto: boolean;
  photoUrls?: string[];
  reviewDate: string;
};
type ReviewsResponse = {
  data: ReviewItem[];
  pagination: { page: number; pageSize: number; total: number };
};

type SortValue = "newest" | "oldest" | "mostHelpful" | "longest";

type FilterState = {
  stars: Set<number>;
  dateFrom: string;
  dateTo: string;
  hasPhoto: boolean;
  q: string;
  sort: SortValue;
  page: number;
};

const STYLE_TAG_ID = "ty-widget-styles";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function injectStylesOnce(root: ShadowRoot) {
  if (root.querySelector(`#${STYLE_TAG_ID}`)) return;
  const style = document.createElement("style");
  style.id = STYLE_TAG_ID;
  style.textContent = `
    .ty-widget { font-family: system-ui, sans-serif; max-width: 640px; color: #1a1a1a; }
    .ty-widget__title { font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
      color: var(--ty-accent, #ff9500); margin: 0 0 10px; }
    .ty-widget__summary { font-size: 18px; font-weight: 600; margin-bottom: 12px; }
    .ty-widget__rating-distribution { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
    .ty-widget__rating-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #444; }
    .ty-widget__rating-row-label { width: 24px; }
    .ty-widget__rating-row-track { flex: 1; height: 6px; background: #eee; border-radius: 3px; overflow: hidden; }
    .ty-widget__rating-row-fill { display: block; height: 100%; background: var(--ty-accent, #ff9500); }
    .ty-widget__rating-row-count { width: 24px; text-align: right; }
    .ty-widget__item-photos { display: flex; gap: 6px; margin-top: 6px; }
    .ty-widget__item-photo { width: 56px; height: 56px; object-fit: cover; border-radius: 6px; }
    .ty-widget__filters { display: flex; flex-wrap: wrap; gap: 12px; align-items: center;
      padding: 10px 12px; background: #f6f6f6; border-radius: 8px; margin-bottom: 12px; font-size: 13px; }
    .ty-widget__stars { display: flex; gap: 6px; border: none; padding: 0; margin: 0; }
    .ty-widget__stars label { display: inline-flex; align-items: center; gap: 2px; cursor: pointer; }
    .ty-widget__filters input[type="search"] { padding: 4px 8px; border: 1px solid #ccc; border-radius: 4px; }
    .ty-widget__filters input[type="date"] { padding: 3px 6px; border: 1px solid #ccc; border-radius: 4px; }
    .ty-widget__filters select { padding: 4px 6px; border: 1px solid #ccc; border-radius: 4px; }
    .ty-widget__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; min-height: 40px; }
    .ty-widget__item { border: 1px solid #e5e5e5; border-radius: 8px; padding: 10px 12px; }
    .ty-widget__item-rating { color: #ff9500; font-weight: 700; margin-right: 6px; }
    .ty-widget__item-author { font-weight: 600; }
    .ty-widget__empty, .ty-widget__error { padding: 12px; color: #666; font-style: italic; }
    .ty-widget__pagination { display: flex; align-items: center; gap: 10px; margin-top: 12px; font-size: 13px; }
    .ty-widget__pagination button { padding: 4px 10px; border: 1px solid #ccc; border-radius: 4px;
      background: #fff; cursor: pointer; }
    .ty-widget__pagination button:disabled { opacity: 0.4; cursor: default; }
  `;
  root.appendChild(style);
}

function buildQueryString(state: FilterState): string {
  const params = new URLSearchParams();
  if (state.stars.size > 0) {
    params.set("stars", [...state.stars].sort().join(","));
  }
  if (state.dateFrom) params.set("dateFrom", state.dateFrom);
  if (state.dateTo) params.set("dateTo", state.dateTo);
  if (state.hasPhoto) params.set("hasPhoto", "true");
  if (state.q) params.set("q", state.q);
  params.set("sort", state.sort);
  params.set("page", String(state.page));
  return params.toString();
}

function renderRatingDistribution(summary: Summary): string {
  const counts = summary.ratingCounts;
  if (!counts) return "";
  const max = Math.max(1, ...[1, 2, 3, 4, 5].map((s) => counts[String(s)] ?? 0));

  const rows = [5, 4, 3, 2, 1]
    .map((s) => {
      const count = counts[String(s)] ?? 0;
      const widthPct = Math.round((count / max) * 100);
      return `
        <div class="ty-widget__rating-row" data-role="rating-bar" data-star="${s}">
          <span class="ty-widget__rating-row-label">${s}★</span>
          <span class="ty-widget__rating-row-track"><span class="ty-widget__rating-row-fill" style="width:${widthPct}%"></span></span>
          <span class="ty-widget__rating-row-count">${count}</span>
        </div>`;
    })
    .join("");

  return `<div class="ty-widget__rating-distribution">${rows}</div>`;
}

function renderShell(summary: Summary): string {
  const starOptions = [5, 4, 3, 2, 1]
    .map((s) => `<label><input type="checkbox" data-star="${s}"> ${s}★</label>`)
    .join("");

  return `
    <div class="ty-widget">
      <div class="ty-widget__title">Trendyol Yorumları</div>
      <div class="ty-widget__summary">Ortalama Puan: ${summary.averageRating.toFixed(1)} (${summary.totalReviews} yorum)</div>
      ${renderRatingDistribution(summary)}
      <div class="ty-widget__filters">
        <fieldset class="ty-widget__stars">${starOptions}</fieldset>
        <label>Başlangıç <input type="date" data-field="dateFrom"></label>
        <label>Bitiş <input type="date" data-field="dateTo"></label>
        <label><input type="checkbox" data-field="hasPhoto"> Sadece fotoğraflı</label>
        <input type="search" data-field="q" placeholder="Yorumlarda ara...">
        <select data-field="sort">
          <option value="newest">En Yeni</option>
          <option value="oldest">En Eski</option>
          <option value="mostHelpful">En Faydalı</option>
          <option value="longest">En Uzun</option>
        </select>
      </div>
      <ul class="ty-widget__list" data-role="list"></ul>
      <div class="ty-widget__pagination">
        <button type="button" data-action="prev">‹ Önceki</button>
        <span data-role="page-info"></span>
        <button type="button" data-action="next">Sonraki ›</button>
      </div>
    </div>
  `;
}

function renderReviewItems(reviews: ReviewItem[]): string {
  if (reviews.length === 0) {
    return `<li class="ty-widget__empty">Bu filtrelere uyan yorum bulunamadı.</li>`;
  }
  return reviews
    .map((r) => {
      const photos = (r.photoUrls ?? [])
        .map((url) => `<img src="${escapeHtml(url)}" alt="" loading="lazy" class="ty-widget__item-photo">`)
        .join("");
      return `
        <li class="ty-widget__item">
          <span class="ty-widget__item-rating">${escapeHtml(String(r.rating))}★</span>
          <span class="ty-widget__item-author">${escapeHtml(r.authorName)}:</span>
          ${escapeHtml(r.comment)}
          ${photos ? `<div class="ty-widget__item-photos">${photos}</div>` : ""}
        </li>`;
    })
    .join("");
}

export async function renderReviewWidget(container: HTMLElement, options: WidgetOptions) {
  const { apiBaseUrl, productId, accentColor } = options;
  const encodedProductId = encodeURIComponent(productId);
  // Shadow DOM içindeki stiller CSS custom property'lerini host elemandan miras alır —
  // bu sayede her müşteri kendi marka rengini widget'ı değiştirmeden verebilir.
  if (accentColor) container.style.setProperty("--ty-accent", accentColor);
  // Widget kendi stilini ve DOM'unu shadow DOM içinde izole eder ki host sitenin
  // CSS'i ile çakışmasın (bkz. design.md bölüm 7).
  const root = container.shadowRoot ?? container.attachShadow({ mode: "open" });

  const state: FilterState = {
    stars: new Set(),
    dateFrom: "",
    dateTo: "",
    hasPhoto: false,
    q: "",
    sort: "newest",
    page: 1,
  };

  root.innerHTML = `<div data-testid="loading">Yorumlar yükleniyor...</div>`;

  let summary: Summary;
  let initialReviews: ReviewsResponse;
  try {
    const [summaryRes, reviewsRes] = await Promise.all([
      fetch(`${apiBaseUrl}/api/v1/products/${encodedProductId}/summary`),
      fetch(`${apiBaseUrl}/api/v1/products/${encodedProductId}/reviews?${buildQueryString(state)}`),
    ]);
    if (!summaryRes.ok || !reviewsRes.ok) {
      throw new Error("API'den başarısız yanıt");
    }
    summary = await summaryRes.json();
    initialReviews = await reviewsRes.json();
  } catch {
    root.innerHTML = `<div class="ty-widget__error">Yorumlar şu an yüklenemiyor.</div>`;
    return;
  }

  root.innerHTML = renderShell(summary);
  injectStylesOnce(root);

  const listEl = root.querySelector<HTMLUListElement>('[data-role="list"]')!;
  const pageInfoEl = root.querySelector<HTMLElement>('[data-role="page-info"]')!;
  const prevBtn = root.querySelector<HTMLButtonElement>('[data-action="prev"]')!;
  const nextBtn = root.querySelector<HTMLButtonElement>('[data-action="next"]')!;

  function applyPagination(pagination: ReviewsResponse["pagination"]) {
    const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize));
    pageInfoEl.textContent = `Sayfa ${state.page} / ${totalPages}`;
    prevBtn.disabled = state.page <= 1;
    nextBtn.disabled = state.page >= totalPages;
  }

  async function loadReviews() {
    listEl.innerHTML = `<li>Yükleniyor...</li>`;
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/products/${encodedProductId}/reviews?${buildQueryString(state)}`);
      if (!res.ok) throw new Error("API'den başarısız yanıt");
      const body: ReviewsResponse = await res.json();
      listEl.innerHTML = renderReviewItems(body.data);
      applyPagination(body.pagination);
    } catch {
      listEl.innerHTML = `<li class="ty-widget__error">Yorumlar yüklenemedi.</li>`;
    }
  }

  root.querySelectorAll<HTMLInputElement>("[data-star]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const star = Number(checkbox.dataset.star);
      if (checkbox.checked) state.stars.add(star);
      else state.stars.delete(star);
      state.page = 1;
      void loadReviews();
    });
  });

  root.querySelector<HTMLInputElement>('[data-field="dateFrom"]')!.addEventListener("change", (e) => {
    state.dateFrom = (e.target as HTMLInputElement).value;
    state.page = 1;
    void loadReviews();
  });

  root.querySelector<HTMLInputElement>('[data-field="dateTo"]')!.addEventListener("change", (e) => {
    state.dateTo = (e.target as HTMLInputElement).value;
    state.page = 1;
    void loadReviews();
  });

  root.querySelector<HTMLInputElement>('[data-field="hasPhoto"]')!.addEventListener("change", (e) => {
    state.hasPhoto = (e.target as HTMLInputElement).checked;
    state.page = 1;
    void loadReviews();
  });

  let searchDebounceHandle: ReturnType<typeof setTimeout> | undefined;
  root.querySelector<HTMLInputElement>('[data-field="q"]')!.addEventListener("input", (e) => {
    const value = (e.target as HTMLInputElement).value;
    if (searchDebounceHandle) clearTimeout(searchDebounceHandle);
    searchDebounceHandle = setTimeout(() => {
      state.q = value;
      state.page = 1;
      void loadReviews();
    }, 400);
  });

  root.querySelector<HTMLSelectElement>('[data-field="sort"]')!.addEventListener("change", (e) => {
    state.sort = (e.target as HTMLSelectElement).value as SortValue;
    state.page = 1;
    void loadReviews();
  });

  prevBtn.addEventListener("click", () => {
    if (state.page <= 1) return;
    state.page -= 1;
    void loadReviews();
  });

  nextBtn.addEventListener("click", () => {
    state.page += 1;
    void loadReviews();
  });

  listEl.innerHTML = renderReviewItems(initialReviews.data);
  applyPagination(initialReviews.pagination);
}
