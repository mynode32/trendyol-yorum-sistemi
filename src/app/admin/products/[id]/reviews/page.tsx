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
    setLoading(true);
    const res = await adminFetch(
      `/api/admin/products/${params.id}/reviews?page=${page}&pageSize=${PAGE_SIZE}`
    );
    const body = await res.json();
    setReviews(body.data);
    setTotal(body.pagination.total);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [params.id, page]);

  async function toggleHidden(review: Review) {
    await adminFetch(`/api/admin/reviews/${review.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isHidden: !review.isHidden }),
    });
    load();
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <h1>Yorum Moderasyonu</h1>
      {loading ? (
        <p>Yükleniyor...</p>
      ) : (
        <ul>
          {reviews.map((r) => (
            <li key={r.id}>
              {r.rating}★ {r.authorName}: {r.comment}
              {r.photoUrls.length > 0 && (
                <span>
                  {" "}
                  {r.photoUrls.map((url) => (
                    <img key={url} src={url} alt="" width={48} height={48} />
                  ))}
                </span>
              )}
              <button onClick={() => toggleHidden(r)}>{r.isHidden ? "Göster" : "Gizle"}</button>
            </li>
          ))}
        </ul>
      )}
      <div>
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
          ‹ Önceki
        </button>{" "}
        <span>
          Sayfa {page} / {totalPages}
        </span>{" "}
        <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
          Sonraki ›
        </button>
      </div>
    </div>
  );
}
