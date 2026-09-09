"use client";
import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/adminFetch";

type Product = { id: string; name: string; trendyolUrl: string; isTracked: boolean; lastScrapedAt: string | null };

function formatDate(value: string | null): string {
  if (!value) return "Henüz taranmadı";
  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/products");
      if (!res.ok) throw new Error();
      const body = await res.json();
      setProducts(body.data);
    } catch {
      setError("Ürünler yüklenemedi. Sayfayı yenilemeyi deneyin.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await adminFetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trendyolUrl: newUrl }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error?.message ?? "Ürün eklenemedi.");
        return;
      }
      setNewUrl("");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleTracked(product: Product) {
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, isTracked: !p.isTracked } : p))
    );
    await adminFetch(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isTracked: !product.isTracked }),
    });
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`"${product.name}" silinsin mi? Bu işlem tüm yorumlarını da siler.`)) return;
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
    await adminFetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Ürünler</h1>
          <p className="page-header__subtitle">
            Trendyol&apos;daki ürünlerinizi takibe alın, yorumlarını yönetin.
          </p>
        </div>
      </div>

      <form onSubmit={addProduct} className="card" style={{ display: "flex", gap: 10, marginBottom: 28 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="trendyolUrl">Trendyol ürün URL&apos;si</label>
          <input
            id="trendyolUrl"
            className="input"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://www.trendyol.com/marka/urun-adi-p-123456789"
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-end" }} disabled={submitting}>
          {submitting ? "Ekleniyor…" : "Ekle"}
        </button>
      </form>

      {error && <p className="alert alert-error" style={{ marginBottom: 20 }}>{error}</p>}

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 64, borderRadius: "var(--radius-md)" }} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <strong>Henüz ürün eklenmedi</strong>
          <p>Yukarıya bir Trendyol ürün URL&apos;si yapıştırarak takibe başlayın.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ürün</th>
                <th>Durum</th>
                <th>Son tarama</th>
                <th aria-label="işlemler"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td style={{ whiteSpace: "normal" }}>
                    <div style={{ fontWeight: 500 }}>{p.name}</div>
                    <a
                      href={p.trendyolUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 12, color: "var(--text-faint)" }}
                    >
                      trendyol.com&apos;da gör ↗
                    </a>
                  </td>
                  <td>
                    <span className={`badge ${p.isTracked ? "badge-success" : "badge-neutral"}`}>
                      {p.isTracked ? "Takip ediliyor" : "Durduruldu"}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>{formatDate(p.lastScrapedAt)}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <a href={`/admin/products/${p.id}/reviews`} className="btn btn-secondary btn-sm">
                        Yorumlar
                      </a>
                      <button className="btn btn-secondary btn-sm" onClick={() => toggleTracked(p)}>
                        {p.isTracked ? "Durdur" : "Başlat"}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteProduct(p)}>
                        Sil
                      </button>
                    </div>
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
