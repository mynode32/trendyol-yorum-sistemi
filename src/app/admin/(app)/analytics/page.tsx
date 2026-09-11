"use client";
import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/adminFetch";
import { KpiCard } from "../_components/KpiCard";
import { useToast } from "../_components/Toast";
import { RatingDistribution, TrendBadge } from "../_components/Analytics";

type Summary = {
  totalReviews: number;
  averageRating: number | null;
  ratingDistribution: Record<string, number>;
  newReviewsLast7Days: number;
  newReviewsLast30Days: number;
  averageRatingChange30d: number | null;
};

type ProductRanking = { id: string; name: string; reviewCount: number; averageRating?: number };

type AnalyticsData = {
  summary: Summary;
  weeklyVolume: { weekStart: string; count: number }[];
  topProductsByReviewCount: ProductRanking[];
  topRatedProducts: ProductRanking[];
  bottomRatedProducts: ProductRanking[];
};

function VolumeChart({ weeks }: { weeks: { weekStart: string; count: number }[] }) {
  const max = Math.max(1, ...weeks.map((w) => w.count));
  return (
    <div className="volume-chart">
      {weeks.map((w) => (
        <div
          key={w.weekStart}
          className={`volume-chart__bar${w.count === 0 ? " volume-chart__bar--empty" : ""}`}
          style={{ height: `${Math.max(3, (w.count / max) * 64)}px` }}
          title={`${new Date(w.weekStart).toLocaleDateString("tr-TR")} haftası: ${w.count} yorum`}
        />
      ))}
    </div>
  );
}

function RankingList({
  items,
  emptyText,
  metric,
}: {
  items: ProductRanking[];
  emptyText: string;
  metric: (item: ProductRanking) => string;
}) {
  if (items.length === 0) {
    return <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{emptyText}</p>;
  }
  return (
    <div className="ranking-list">
      {items.map((item) => (
        <div className="ranking-row" key={item.id}>
          <span className="ranking-row__name" title={item.name}>
            {item.name}
          </span>
          <span className="ranking-row__meta">{metric(item)}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch("/api/admin/analytics")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((body) => setData(body))
      .catch(() => showToast("Analytics verisi yüklenemedi. Sayfayı yenilemeyi deneyin.", "error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <h1>Analytics</h1>
          <p className="page-header__subtitle">Yorumlarınızın genel görünümü.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: "var(--radius-md)" }} />
          ))}
        </div>
      ) : !data || data.summary.totalReviews === 0 ? (
        <div className="empty-state">
          <strong>Henüz yorum yok</strong>
          <p>Ürünleriniz tarandıkça burada anlamlı veriler görünecek.</p>
        </div>
      ) : (
        <>
          <div className="kpi-grid">
            <KpiCard label="Toplam Yorum" value={data.summary.totalReviews} />
            <KpiCard
              label="Ortalama Puan"
              value={data.summary.averageRating != null ? `★ ${data.summary.averageRating.toFixed(2)}` : "—"}
            />
            <KpiCard label="Son 7 Günde Yeni" value={data.summary.newReviewsLast7Days} />
            <KpiCard label="Son 30 Günde Yeni" value={data.summary.newReviewsLast30Days} />
          </div>

          <div className="analytics-grid">
            <div className="card">
              <h2 style={{ fontSize: 15, marginBottom: 4 }}>Puan Dağılımı</h2>
              <p style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 14 }}>
                Gizlenmemiş tüm yorumlar üzerinden.
              </p>
              <RatingDistribution distribution={data.summary.ratingDistribution} total={data.summary.totalReviews} />
            </div>

            <div className="card">
              <h2 style={{ fontSize: 15, marginBottom: 4 }}>Son 30 Gün Trendi</h2>
              <p style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 14 }}>
                Önceki 30 güne göre ortalama puan değişimi.
              </p>
              <div style={{ fontSize: 22, marginBottom: 6 }}>
                <TrendBadge change={data.summary.averageRatingChange30d} />
              </div>

              <h2 style={{ fontSize: 15, margin: "20px 0 4px" }}>Haftalık Yorum Hacmi</h2>
              <p style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 14 }}>
                Son 8 hafta, gerçek yorum tarihine göre.
              </p>
              <VolumeChart weeks={data.weeklyVolume} />
            </div>
          </div>

          <div className="analytics-grid">
            <div className="card">
              <h2 style={{ fontSize: 15, marginBottom: 14 }}>En Çok Yorum Alan Ürünler</h2>
              <RankingList
                items={data.topProductsByReviewCount}
                emptyText="Henüz yeterli veri yok."
                metric={(item) => `${item.reviewCount} yorum`}
              />
            </div>

            <div className="card">
              <h2 style={{ fontSize: 15, marginBottom: 4 }}>En Yüksek / En Düşük Puanlı Ürünler</h2>
              <p style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 14 }}>
                En az 3 yorumu olan ürünler arasından.
              </p>
              <RankingList
                items={data.topRatedProducts}
                emptyText="Henüz yeterli veri yok."
                metric={(item) => `★ ${item.averageRating?.toFixed(2)} (${item.reviewCount})`}
              />
              {data.bottomRatedProducts.length > 0 && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                  <RankingList
                    items={data.bottomRatedProducts}
                    emptyText=""
                    metric={(item) => `★ ${item.averageRating?.toFixed(2)} (${item.reviewCount})`}
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
