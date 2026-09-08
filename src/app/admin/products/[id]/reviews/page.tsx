"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Review = { id: string; rating: number; comment: string; authorName: string; isHidden: boolean };

export default function ProductReviewsModerationPage() {
  const params = useParams<{ id: string }>();
  const [reviews, setReviews] = useState<Review[]>([]);

  async function load() {
    const res = await fetch(`/api/admin/products/${params.id}/reviews`);
    const body = await res.json();
    setReviews(body.data);
  }

  useEffect(() => {
    load();
  }, [params.id]);

  async function toggleHidden(review: Review) {
    await fetch(`/api/admin/reviews/${review.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isHidden: !review.isHidden }),
    });
    load();
  }

  return (
    <div>
      <h1>Yorum Moderasyonu</h1>
      <ul>
        {reviews.map((r) => (
          <li key={r.id}>
            {r.rating}★ {r.authorName}: {r.comment}
            <button onClick={() => toggleHidden(r)}>{r.isHidden ? "Göster" : "Gizle"}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
