type WidgetOptions = { apiBaseUrl: string; productId: string };

type Summary = { averageRating: number; totalReviews: number };
type ReviewItem = {
  id: string;
  rating: number;
  comment: string;
  authorName: string;
  hasPhoto: boolean;
  reviewDate: string;
};

export async function renderReviewWidget(container: HTMLElement, options: WidgetOptions) {
  const { apiBaseUrl, productId } = options;

  container.innerHTML = `<div data-testid="loading">Yorumlar yükleniyor...</div>`;

  try {
    const [summaryRes, reviewsRes] = await Promise.all([
      fetch(`${apiBaseUrl}/api/v1/products/${productId}/summary`),
      fetch(`${apiBaseUrl}/api/v1/products/${productId}/reviews`),
    ]);

    const summary: Summary = await summaryRes.json();
    const reviewsBody: { data: ReviewItem[] } = await reviewsRes.json();

    container.innerHTML = `
      <div class="ty-widget">
        <div class="ty-widget__summary">Ortalama Puan: ${summary.averageRating.toFixed(1)} (${summary.totalReviews} yorum)</div>
        <ul class="ty-widget__list">
          ${reviewsBody.data
            .map(
              (r) => `
            <li class="ty-widget__item">
              <strong>${r.rating}★</strong> ${r.authorName}: ${r.comment}
            </li>`
            )
            .join("")}
        </ul>
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<div class="ty-widget__error">Yorumlar şu an yüklenemiyor.</div>`;
  }
}
