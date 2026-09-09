"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { adminFetch } from "@/lib/adminFetch";

type Review = {
  id: string;
  rating: number;
  comment: string;
  authorName: string;
  isHidden: boolean;
  photoUrls: string[];
};

const PAGE_SIZE = 50;

export default function ProductReviewsModerationPage() {
  const params = useParams<{ id: string }>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await adminFetch(
        `/api/admin/products/${params.id}/reviews?page=${page}&pageSize=${PAGE_SIZE}`
      );
      if (!res.ok) throw new Error("Yorumlar yüklenemedi");
      const body = await res.json();
      setReviews(body.data);
      setTotal(body.pagination.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, page]);

  async function toggleHidden(review: Review) {
    setReviews((prev) =>
      prev.map((r) => (r.id === review.id ? { ...r, isHidden: !r.isHidden } : r))
    );
    await adminFetch(`/api/admin/reviews/${review.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isHidden: !review.isHidden }),
    });
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="page">
      <a
        href="/admin/products"
        style={{ fontSize: 13, color: "var(--text-muted)", display: "inline-block", marginBottom: 12 }}
      >
        ‹ Ürünlere dön
      </a>
      <div className="page-header">
        <div>
          <h1>Yorum Moderasyonu</h1>
          <p className="page-header__subtitle">
            {total > 0 ? `${total} yorum` : "Uygun olmayan yorumları gizleyin."}
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 84, borderRadius: "var(--radius-md)" }} />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="empty-state">
          <strong>Henüz yorum çekilmedi</strong>
          <p>Scraper bu ürün için ilk taramasını tamamladığında yorumlar burada listelenecek.</p>
        </div>
      ) : (
        <ul style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {reviews.map((r) => (
            <li
              key={r.id}
              className="card"
              style={{ opacity: r.isHidden ? 0.55 : 1, display: "flex", gap: 14, alignItems: "flex-start" }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ color: "var(--accent)", fontWeight: 600 }}>{r.rating}★</span>
                  <span style={{ fontWeight: 500 }}>{r.authorName}</span>
                  {r.isHidden && <span className="badge badge-neutral">Gizli</span>}
                </div>
                <p style={{ color: "var(--text-muted)" }}>{r.comment}</p>
                {r.photoUrls.length > 0 && (
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    {r.photoUrls.map((url) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={url}
                        src={url}
                        alt={`${r.authorName} tarafından paylaşılan yorum fotoğrafı`}
                        width={48}
                        height={48}
                        style={{ borderRadius: "var(--radius-sm)", objectFit: "cover" }}
                      />
                    ))}
                  </div>
                )}
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => toggleHidden(r)}>
                {r.isHidden ? "Göster" : "Gizle"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setLoading(true);
              setPage((p) => Math.max(1, p - 1));
            }}
            disabled={page <= 1}
          >
            ‹ Önceki
          </button>
          <span>
            Sayfa {page} / {totalPages}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setLoading(true);
              setPage((p) => p + 1);
            }}
            disabled={page >= totalPages}
          >
            Sonraki ›
          </button>
        </div>
      )}
    </div>
  );
}
