export type ParsedReview = {
  trendyolReviewId: string;
  rating: number;
  comment: string;
  authorName: string;
  hasPhoto: boolean;
  photoUrls: string[];
  reviewDate: Date;
  helpfulCount: number;
};

// Trendyol'un iç API yanıt zarfı; alan adları
// docs/trendyol-endpoint-notes.md içindeki gerçek keşfe göre belirlenmiştir.
type RawTrendyolReview = {
  id: number | string;
  rate: number;
  comment: string;
  userFullName: string;
  mediaFiles?: { url: string }[];
  createdAt: number;
  likesCount?: number;
};

type RawTrendyolResponse = {
  result?: {
    reviews?: RawTrendyolReview[];
  };
};

export function parseReviewResponse(raw: unknown): ParsedReview[] {
  const response = raw as RawTrendyolResponse;
  const items = response.result?.reviews ?? [];

  return items.map((item) => ({
    trendyolReviewId: String(item.id),
    rating: item.rate,
    comment: item.comment ?? "",
    authorName: item.userFullName ?? "Anonim",
    hasPhoto: (item.mediaFiles?.length ?? 0) > 0,
    photoUrls: (item.mediaFiles ?? []).map((m) => m.url),
    reviewDate: new Date(item.createdAt),
    helpfulCount: item.likesCount ?? 0,
  }));
}
