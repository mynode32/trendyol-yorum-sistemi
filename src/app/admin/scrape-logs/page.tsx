"use client";
import { useEffect, useState } from "react";

type ScrapeLog = {
  id: string;
  status: string;
  newReviews: number;
  startedAt: string;
  finishedAt: string | null;
  errorMessage: string | null;
  product: { name: string };
};

export default function ScrapeLogsPage() {
  const [logs, setLogs] = useState<ScrapeLog[]>([]);

  useEffect(() => {
    fetch("/api/admin/scrape-logs")
      .then((res) => res.json())
      .then((body) => setLogs(body.data));
  }, []);

  return (
    <div>
      <h1>Scraper İzleme</h1>
      <table>
        <thead>
          <tr>
            <th>Ürün</th>
            <th>Durum</th>
            <th>Yeni Yorum</th>
            <th>Başlangıç</th>
            <th>Hata</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{log.product.name}</td>
              <td>{log.status}</td>
              <td>{log.newReviews}</td>
              <td>{new Date(log.startedAt).toLocaleString("tr-TR")}</td>
              <td>{log.errorMessage ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
