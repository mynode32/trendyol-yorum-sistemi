type WidgetOptions = {
  apiBaseUrl: string;
  // İkisinden en az biri verilmeli: productId doğrudan bizim internal id'miz,
  // externalRef ise host sitenin kendi ürün kodu (örn. İdeaSoft stok kodu) —
  // verilirse önce /resolve ile productId'ye çevrilir. Bu sayede tek bir
  // site-geneli script tag'i her ürün sayfasında doğru ürünü bulabilir.
  productId?: string;
  externalRef?: string;
  // externalRef ile birlikte kullanılır — /resolve'a iletilir, ürünün storeId'si
  // ile eşleşmezse (yanlış siteye yapıştırılmış script gibi bir hata) sonuç boş döner.
  storeId?: string;
  accentColor?: string;
  hideFilters?: boolean;
  storeUrl?: string;
  carousel?: boolean;
  hideSummary?: boolean;
};

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

function safeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function injectStylesOnce(root: ShadowRoot) {
  if (root.querySelector(`#${STYLE_TAG_ID}`)) return;
  const style = document.createElement("style");
  style.id = STYLE_TAG_ID;
  style.textContent = `
    .ty-widget { font-family: system-ui, sans-serif; width: 100%; box-sizing: border-box; color: #1a1a1a; }
    .ty-widget *, .ty-widget *::before, .ty-widget *::after { box-sizing: border-box; }
    .ty-widget__title { font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
      color: var(--ty-accent, #ff9500); margin: 0 0 10px; }
    .ty-widget__summary { font-size: 18px; font-weight: 600; margin-bottom: 12px; }
    .ty-widget__store-link { display: inline-block; font-size: 13px; color: var(--ty-accent, #ff9500);
      text-decoration: none; margin-bottom: 12px; }
    .ty-widget__store-link:hover { text-decoration: underline; }
    .ty-widget__rating-distribution { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
    .ty-widget__rating-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #444; }
    .ty-widget__rating-row-label { width: 24px; }
    .ty-widget__rating-row-track { flex: 1; height: 6px; background: #eee; border-radius: 3px; overflow: hidden; }
    .ty-widget__rating-row-fill { display: block; height: 100%; background: var(--ty-accent, #ff9500); }
    .ty-widget__rating-row-count { width: 24px; text-align: right; }
    .ty-widget__item-photos { display: flex; gap: 6px; margin-top: 6px; }
    .ty-widget__item-photo { width: 56px; height: 56px; object-fit: cover; border-radius: 6px; cursor: zoom-in; }
    .ty-widget__item { cursor: pointer; }
    .ty-widget__overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex;
      align-items: center; justify-content: center; z-index: 2147483000; padding: 20px; }
    .ty-widget__overlay[hidden] { display: none; }
    .ty-widget__modal { background: #fff; border-radius: 10px; padding: 20px; max-width: 480px; width: 100%;
      max-height: 80vh; overflow-y: auto; }
    .ty-widget__modal-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .ty-widget__modal-comment { color: #333; line-height: 1.6; white-space: pre-wrap; }
    .ty-widget__modal-photos { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
    .ty-widget__modal-photo { width: 130px; height: 130px; object-fit: cover; border-radius: 8px; cursor: zoom-in; }
    .ty-widget__modal-close { margin-top: 16px; padding: 6px 14px; border: 1px solid #ccc; border-radius: 6px;
      background: #f6f6f6; cursor: pointer; }
    .ty-widget__lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex;
      align-items: center; justify-content: center; z-index: 2147483001; padding: 20px; cursor: zoom-out; }
    .ty-widget__lightbox[hidden] { display: none; }
    .ty-widget__lightbox-img { max-width: 100%; max-height: 100%; border-radius: 8px; }
    .ty-widget__filters { display: flex; flex-wrap: wrap; gap: 12px; align-items: center;
      padding: 10px 12px; background: #f6f6f6; border-radius: 8px; margin-bottom: 12px; font-size: 13px; }
    .ty-widget__stars { display: flex; gap: 6px; border: none; padding: 0; margin: 0; }
    .ty-widget__stars label { display: inline-flex; align-items: center; gap: 2px; cursor: pointer; }
    .ty-widget__filters input[type="search"] { padding: 4px 8px; border: 1px solid #ccc; border-radius: 4px; }
    .ty-widget__filters input[type="date"] { padding: 3px 6px; border: 1px solid #ccc; border-radius: 4px; }
    .ty-widget__filters select { padding: 4px 6px; border: 1px solid #ccc; border-radius: 4px; }
    .ty-widget__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; min-height: 40px; }
    .ty-widget__list--carousel { overflow: hidden; padding: 6px 0 10px;
      -webkit-mask-image: linear-gradient(to right, transparent, black 32px, black calc(100% - 32px), transparent);
      mask-image: linear-gradient(to right, transparent, black 32px, black calc(100% - 32px), transparent); }
    .ty-widget__carousel-track { display: flex; gap: 14px; width: max-content;
      animation: ty-widget-scroll 32s linear infinite; }
    .ty-widget__list--carousel:hover .ty-widget__carousel-track,
    .ty-widget__list--carousel:focus-within .ty-widget__carousel-track { animation-play-state: paused; }
    @keyframes ty-widget-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
    .ty-widget__list--carousel .ty-widget__item { flex: 0 0 260px; box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      padding: 14px 16px; transition: transform 0.18s ease, box-shadow 0.18s ease; }
    .ty-widget__list--carousel .ty-widget__item:hover { transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.14); }
    .ty-widget__item { border: 1px solid #e5e5e5; border-radius: 8px; padding: 10px 12px; }
    .ty-widget__item-stars { display: inline-block; margin-right: 6px; letter-spacing: 1px; }
    .ty-widget__item-stars-filled { color: #ff9500; }
    .ty-widget__item-stars-empty { color: #ddd; }
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

function renderShell(
  summary: Summary,
  shellOptions: { hideFilters?: boolean; storeUrl?: string; carousel?: boolean; hideSummary?: boolean }
): string {
  const starOptions = [5, 4, 3, 2, 1]
    .map((s) => `<label><input type="checkbox" data-star="${s}"> ${s}★</label>`)
    .join("");

  const filters = shellOptions.hideFilters
    ? ""
    : `
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
      </div>`;

  const safeStoreUrl = shellOptions.storeUrl ? safeExternalUrl(shellOptions.storeUrl) : null;
  const storeLink = safeStoreUrl
    ? `<a class="ty-widget__store-link" href="${escapeHtml(safeStoreUrl)}" target="_blank" rel="noopener noreferrer">Trendyol mağazamızı görüntüleyin ↗</a>`
    : "";

  const listClass = shellOptions.carousel ? "ty-widget__list ty-widget__list--carousel" : "ty-widget__list";

  // Kaydırmalı vitrin modunda sayfalama anlamsız (tüm yüklenen yorumlar zaten
  // sürekli kayarak gösteriliyor) — bu yüzden gizleniyor.
  const pagination = shellOptions.carousel
    ? ""
    : `
      <div class="ty-widget__pagination">
        <button type="button" data-action="prev">‹ Önceki</button>
        <span data-role="page-info"></span>
        <button type="button" data-action="next">Sonraki ›</button>
      </div>`;

  const summarySection = shellOptions.hideSummary
    ? ""
    : `
      <div class="ty-widget__summary">Ortalama Puan: ${summary.averageRating.toFixed(1)} (${summary.totalReviews} yorum)</div>
      ${renderRatingDistribution(summary)}`;

  return `
    <div class="ty-widget">
      <div class="ty-widget__title">Trendyol Yorumları</div>
      ${summarySection}
      ${storeLink}
      ${filters}
      <ul class="${listClass}" data-role="list"></ul>
      ${pagination}
    </div>
  `;
}

function renderStars(rating: number): string {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  const empty = 5 - filled;
  return `<span class="ty-widget__item-stars">
    <span class="ty-widget__item-stars-filled">${"★".repeat(filled)}</span><span class="ty-widget__item-stars-empty">${"☆".repeat(empty)}</span>
  </span>`;
}

function renderReviewItemsHtml(reviews: ReviewItem[]): string {
  return reviews
    .map((r) => {
      const photos = (r.photoUrls ?? [])
        .map(safeExternalUrl)
        .filter((url): url is string => Boolean(url))
        .map((url) => `<img src="${escapeHtml(url)}" alt="" loading="lazy" class="ty-widget__item-photo">`)
        .join("");
      return `
        <li class="ty-widget__item" data-review-id="${escapeHtml(r.id)}">
          ${renderStars(r.rating)}
          <span class="ty-widget__item-author">${escapeHtml(r.authorName)}:</span>
          ${escapeHtml(r.comment)}
          ${photos ? `<div class="ty-widget__item-photos">${photos}</div>` : ""}
        </li>`;
    })
    .join("");
}

function renderOverlaysHtml(): string {
  return `
    <div class="ty-widget__overlay" data-role="detail-overlay" hidden>
      <div class="ty-widget__modal">
        <div class="ty-widget__modal-header" data-role="modal-header"></div>
        <div class="ty-widget__modal-comment" data-role="modal-comment"></div>
        <div class="ty-widget__modal-photos" data-role="modal-photos"></div>
        <button type="button" class="ty-widget__modal-close" data-action="close-detail">Kapat</button>
      </div>
    </div>
    <div class="ty-widget__lightbox" data-role="lightbox-overlay" hidden>
      <img class="ty-widget__lightbox-img" data-role="lightbox-img" alt="Yorum fotoğrafı">
    </div>`;
}

function renderReviewItems(reviews: ReviewItem[], carousel?: boolean): string {
  if (reviews.length === 0) {
    return `<li class="ty-widget__empty">Bu filtrelere uyan yorum bulunamadı.</li>`;
  }
  const itemsHtml = renderReviewItemsHtml(reviews);
  if (!carousel) return itemsHtml;
  // Kesintisiz döngü illüzyonu için kart dizisi iki kez tekrarlanıp track %50
  // kaydırılır — track sonuna gelince başa dönmüş gibi görünür (bkz. CSS
  // ty-widget-scroll keyframe'i, translateX(-50%)).
  return `<div class="ty-widget__carousel-track">${itemsHtml}${renderReviewItemsHtml(reviews)}</div>`;
}

export async function renderReviewWidget(container: HTMLElement, options: WidgetOptions) {
  const { apiBaseUrl, accentColor, hideFilters, storeUrl, carousel, hideSummary, externalRef, storeId } = options;
  // Shadow DOM içindeki stiller CSS custom property'lerini host elemandan miras alır —
  // bu sayede her müşteri kendi marka rengini widget'ı değiştirmeden verebilir.
  if (accentColor) container.style.setProperty("--ty-accent", accentColor);
  // Widget kendi stilini ve DOM'unu shadow DOM içinde izole eder ki host sitenin
  // CSS'i ile çakışmasın (bkz. design.md bölüm 7).
  const root = container.shadowRoot ?? container.attachShadow({ mode: "open" });

  root.innerHTML = `<div data-testid="loading">Yorumlar yükleniyor...</div>`;

  let productId = options.productId;
  if (!productId && externalRef) {
    try {
      const storeIdQuery = storeId ? `&storeId=${encodeURIComponent(storeId)}` : "";
      const resolveRes = await fetch(
        `${apiBaseUrl}/api/v1/products/resolve?ref=${encodeURIComponent(externalRef)}${storeIdQuery}`
      );
      if (resolveRes.ok) {
        productId = (await resolveRes.json()).id;
      }
    } catch {
      // productId undefined kalır, aşağıda sessizce hiçbir şey render edilmez.
    }
  }
  if (!productId) {
    // Bu sayfadaki ürün için eşleşen bir Trendyol ürünü henüz yok/taranmamış —
    // hata göstermek yerine widget'ı sessizce boş bırakıyoruz (tek bir
    // site-geneli script her ürün sayfasında çalıştığı için bu normal bir durum).
    root.innerHTML = "";
    return;
  }
  const encodedProductId = encodeURIComponent(productId);

  const state: FilterState = {
    stars: new Set(),
    dateFrom: "",
    dateTo: "",
    hasPhoto: false,
    q: "",
    sort: "newest",
    page: 1,
  };

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

  root.innerHTML = renderShell(summary, { hideFilters, storeUrl, carousel, hideSummary }) + renderOverlaysHtml();
  injectStylesOnce(root);

  const listEl = root.querySelector<HTMLUListElement>('[data-role="list"]')!;
  const pageInfoEl = root.querySelector<HTMLElement>('[data-role="page-info"]');
  const prevBtn = root.querySelector<HTMLButtonElement>('[data-action="prev"]');
  const nextBtn = root.querySelector<HTMLButtonElement>('[data-action="next"]');

  const detailOverlay = root.querySelector<HTMLElement>('[data-role="detail-overlay"]')!;
  const modalHeader = root.querySelector<HTMLElement>('[data-role="modal-header"]')!;
  const modalComment = root.querySelector<HTMLElement>('[data-role="modal-comment"]')!;
  const modalPhotos = root.querySelector<HTMLElement>('[data-role="modal-photos"]')!;
  const lightboxOverlay = root.querySelector<HTMLElement>('[data-role="lightbox-overlay"]')!;
  const lightboxImg = root.querySelector<HTMLImageElement>('[data-role="lightbox-img"]')!;

  let reviewsById = new Map<string, ReviewItem>();
  function indexReviews(reviews: ReviewItem[]) {
    reviewsById = new Map(reviews.map((r) => [r.id, r]));
  }

  function openLightbox(url: string) {
    lightboxImg.src = url;
    lightboxOverlay.hidden = false;
  }
  function closeLightbox() {
    lightboxOverlay.hidden = true;
    lightboxImg.src = "";
  }
  function openDetail(review: ReviewItem) {
    modalHeader.innerHTML = `${renderStars(review.rating)}<span class="ty-widget__item-author">${escapeHtml(review.authorName)}</span>`;
    modalComment.textContent = review.comment;
    modalPhotos.innerHTML = (review.photoUrls ?? [])
      .map(safeExternalUrl)
      .filter((url): url is string => Boolean(url))
      .map((url) => `<img src="${escapeHtml(url)}" class="ty-widget__modal-photo" data-role="modal-photo" alt="">`)
      .join("");
    detailOverlay.hidden = false;
  }
  function closeDetail() {
    detailOverlay.hidden = true;
  }

  detailOverlay.addEventListener("click", (e) => {
    if (e.target === detailOverlay) closeDetail();
  });
  root.querySelector('[data-action="close-detail"]')?.addEventListener("click", closeDetail);
  lightboxOverlay.addEventListener("click", closeLightbox);
  modalPhotos.addEventListener("click", (e) => {
    const img = (e.target as HTMLElement).closest<HTMLImageElement>('[data-role="modal-photo"]');
    if (img) openLightbox(img.src);
  });
  listEl.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const photoImg = target.closest<HTMLImageElement>(".ty-widget__item-photo");
    if (photoImg) {
      openLightbox(photoImg.src);
      return;
    }
    const item = target.closest<HTMLElement>(".ty-widget__item[data-review-id]");
    const review = item ? reviewsById.get(item.dataset.reviewId!) : undefined;
    if (review) openDetail(review);
  });

  function applyPagination(pagination: ReviewsResponse["pagination"]) {
    if (!pageInfoEl || !prevBtn || !nextBtn) return;
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
      indexReviews(body.data);
      listEl.innerHTML = renderReviewItems(body.data, carousel);
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

  root.querySelector<HTMLInputElement>('[data-field="dateFrom"]')?.addEventListener("change", (e) => {
    state.dateFrom = (e.target as HTMLInputElement).value;
    state.page = 1;
    void loadReviews();
  });

  root.querySelector<HTMLInputElement>('[data-field="dateTo"]')?.addEventListener("change", (e) => {
    state.dateTo = (e.target as HTMLInputElement).value;
    state.page = 1;
    void loadReviews();
  });

  root.querySelector<HTMLInputElement>('[data-field="hasPhoto"]')?.addEventListener("change", (e) => {
    state.hasPhoto = (e.target as HTMLInputElement).checked;
    state.page = 1;
    void loadReviews();
  });

  let searchDebounceHandle: ReturnType<typeof setTimeout> | undefined;
  root.querySelector<HTMLInputElement>('[data-field="q"]')?.addEventListener("input", (e) => {
    const value = (e.target as HTMLInputElement).value;
    if (searchDebounceHandle) clearTimeout(searchDebounceHandle);
    searchDebounceHandle = setTimeout(() => {
      state.q = value;
      state.page = 1;
      void loadReviews();
    }, 400);
  });

  root.querySelector<HTMLSelectElement>('[data-field="sort"]')?.addEventListener("change", (e) => {
    state.sort = (e.target as HTMLSelectElement).value as SortValue;
    state.page = 1;
    void loadReviews();
  });

  prevBtn?.addEventListener("click", () => {
    if (state.page <= 1) return;
    state.page -= 1;
    void loadReviews();
  });

  nextBtn?.addEventListener("click", () => {
    state.page += 1;
    void loadReviews();
  });

  indexReviews(initialReviews.data);
  listEl.innerHTML = renderReviewItems(initialReviews.data, carousel);
  applyPagination(initialReviews.pagination);
}
