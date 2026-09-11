"use client";
import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/adminFetch";
import { KpiCard } from "../_components/KpiCard";

type ScrapeLog = {
  id: string;
  status: string;
  newReviews: number;
  startedAt: string;
  finishedAt: string | null;
  errorMessage: string | null;
  product: { name: string };
};

function StatusBadge({ status }: { status: string }) {
  if (status === "success") return <span className="badge badge-success">Başarılı</span>;
  if (status === "failed") return <span className="badge badge-danger">Başarısız</span>;
  return <span className="badge badge-neutral">{status}</span>;
}

export default function ScrapeLogsPage() {
  const [logs, setLogs] = useState<ScrapeLog[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    adminFetch("/api/admin/scrape-logs")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((body) => setLogs(body.data))
      .catch(() => setError(true));
  }, []);

  const successCount = logs?.filter((l) => l.status === "success").length ?? 0;
  const failedCount = logs?.filter((l) => l.status === "failed").length ?? 0;
  const newReviewsTotal = logs?.reduce((sum, l) => sum + l.newReviews, 0) ?? 0;

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <h1>Scraper İzleme</h1>
          <p className="page-header__subtitle">Son 100 tarama çalıştırması.</p>
        </div>
      </div>
      <p className="page-header__subtitle" style={{ marginBottom: 20 }}>
        Otomatik izleme için <code>/api/admin/health</code> endpoint&apos;i son tarama ve veri güncelliği durumunu verir.
      </p>

      {logs && logs.length > 0 && (
        <div className="kpi-grid">
          <KpiCard label="Başarılı" value={successCount} />
          <KpiCard label="Başarısız" value={failedCount} />
          <KpiCard label="Toplam Yeni Yorum" value={newReviewsTotal} />
        </div>
      )}

      {error ? (
        <p className="alert alert-error">Tarama kayıtları yüklenemedi. Sayfayı yenilemeyi deneyin.</p>
      ) : logs === null ? (
        <div className="skeleton" style={{ height: 240, borderRadius: "var(--radius-md)" }} />
      ) : logs.length === 0 ? (
        <div className="empty-state">
          <strong>Henüz tarama çalıştırılmadı</strong>
          <p>
            Manuel tetiklemek için <code>npm run scrape:once -- &lt;trendyolProductId&gt;</code>{" "}
            komutunu kullanın.
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ürün</th>
                <th>Durum</th>
                <th>Yeni yorum</th>
                <th>Başlangıç</th>
                <th>Hata</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.product.name}</td>
                  <td>
                    <StatusBadge status={log.status} />
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{log.newReviews}</td>
                  <td style={{ color: "var(--text-muted)" }}>
                    {new Date(log.startedAt).toLocaleString("tr-TR")}
                  </td>
                  <td style={{ whiteSpace: "normal", color: "var(--danger)", maxWidth: 320 }}>
                    {log.errorMessage ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
