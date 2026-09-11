"use client";
import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/lib/adminFetch";
import { KpiCard } from "../_components/KpiCard";
import { useToast } from "../_components/Toast";

type ScrapeLog = {
  id: string;
  status: string;
  newReviews: number;
  startedAt: string;
  finishedAt: string | null;
  errorMessage: string | null;
  product: { name: string };
};

type StatusFilter = "all" | "success" | "failed";

function StatusBadge({ status }: { status: string }) {
  if (status === "success") return <span className="badge badge-success">Başarılı</span>;
  if (status === "failed") return <span className="badge badge-danger">Başarısız</span>;
  return <span className="badge badge-neutral">{status}</span>;
}

export default function ScrapeLogsPage() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<ScrapeLog[] | null>(null);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    adminFetch("/api/admin/scrape-logs")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((body) => setLogs(body.data))
      .catch(() => showToast("Tarama kayıtları yüklenemedi. Sayfayı yenilemeyi deneyin.", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const successCount = logs?.filter((l) => l.status === "success").length ?? 0;
  const failedCount = logs?.filter((l) => l.status === "failed").length ?? 0;
  const newReviewsTotal = logs?.reduce((sum, l) => sum + l.newReviews, 0) ?? 0;

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    const term = searchText.trim().toLowerCase();
    return logs.filter(
      (l) =>
        (statusFilter === "all" || l.status === statusFilter) &&
        (!term || l.product.name.toLowerCase().includes(term))
    );
  }, [logs, searchText, statusFilter]);

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

      {logs && logs.length > 0 && (
        <div className="filter-bar">
          <input
            className="input"
            placeholder="Ürün adına göre ara…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <select
            className="input filter-bar__select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="all">Tüm durumlar</option>
            <option value="success">Başarılı</option>
            <option value="failed">Başarısız</option>
          </select>
        </div>
      )}

      {logs === null ? (
        <div className="skeleton" style={{ height: 240, borderRadius: "var(--radius-md)" }} />
      ) : logs.length === 0 ? (
        <div className="empty-state">
          <strong>Henüz tarama çalıştırılmadı</strong>
          <p>
            Manuel tetiklemek için <code>npm run scrape:once -- &lt;trendyolProductId&gt;</code>{" "}
            komutunu kullanın.
          </p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="empty-state">
          <strong>Eşleşen kayıt yok</strong>
          <p>Arama veya durum filtresini değiştirmeyi deneyin.</p>
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
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td className="td-stack" data-label="Ürün">{log.product.name}</td>
                  <td data-label="Durum">
                    <StatusBadge status={log.status} />
                  </td>
                  <td data-label="Yeni yorum" style={{ fontFamily: "var(--font-mono)" }}>{log.newReviews}</td>
                  <td data-label="Başlangıç" style={{ color: "var(--text-muted)" }}>
                    {new Date(log.startedAt).toLocaleString("tr-TR")}
                  </td>
                  <td
                    className="td-stack"
                    data-label="Hata"
                    style={{ whiteSpace: "normal", color: "var(--danger)", maxWidth: 320 }}
                  >
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
