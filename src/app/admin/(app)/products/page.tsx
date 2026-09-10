"use client";
import { Fragment, useEffect, useState } from "react";
import { adminFetch } from "@/lib/adminFetch";

type Product = {
  id: string;
  name: string;
  imageUrl: string | null;
  trendyolUrl: string;
  isTracked: boolean;
  lastScrapedAt: string | null;
  minRating: number | null;
  maxDisplayedReviews: number;
  externalRef: string | null;
};

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
  const [newMinRating, setNewMinRating] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionProductId, setActionProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [widgetCodeProductId, setWidgetCodeProductId] = useState<string | null>(null);
  const [copiedProductId, setCopiedProductId] = useState<string | null>(null);

  async function load() {
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
    // İlk veri yüklemesi ağ yanıtından sonra state'i günceller; kural bu async
    // yardımcıyı doğrudan effect içinde çağırmayı yine de işaretler.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await adminFetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trendyolUrl: newUrl,
          ...(newMinRating ? { minRating: Number(newMinRating) } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error?.message ?? "Ürün eklenemedi.");
        return;
      }
      setNewUrl("");
      setNewMinRating("");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleTracked(product: Product) {
    setActionProductId(product.id);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTracked: !product.isTracked }),
      });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      setError("Ürün takip durumu güncellenemedi.");
    } finally {
      setActionProductId(null);
    }
  }

  async function updateMinRating(product: Product, rawValue: string) {
    const minRating = rawValue ? Number(rawValue) : null;
    setActionProductId(product.id);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minRating }),
      });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      setError("Minimum puan güncellenemedi.");
    } finally {
      setActionProductId(null);
    }
  }

  async function updateMaxDisplayedReviews(product: Product, rawValue: string) {
    const maxDisplayedReviews = Number(rawValue);
    if (!Number.isInteger(maxDisplayedReviews) || maxDisplayedReviews < 1) return;
    setActionProductId(product.id);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxDisplayedReviews }),
      });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      setError("Gösterilecek yorum sayısı güncellenemedi.");
    } finally {
      setActionProductId(null);
    }
  }

  async function updateExternalRef(product: Product, rawValue: string) {
    const externalRef = rawValue.trim() ? rawValue.trim() : null;
    if (externalRef === product.externalRef) return;
    setActionProductId(product.id);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ externalRef }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Site stok kodu güncellenemedi.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Site stok kodu güncellenemedi.");
    } finally {
      setActionProductId(null);
    }
  }

  function widgetSnippet(product: Product): string {
    const apiBaseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `<script src="${apiBaseUrl}/widget/widget.js" data-product-id="${product.id}"></script>`;
  }

  async function copyWidgetSnippet(product: Product) {
    try {
      await navigator.clipboard.writeText(widgetSnippet(product));
      setCopiedProductId(product.id);
      setTimeout(() => setCopiedProductId((id) => (id === product.id ? null : id)), 2000);
    } catch {
      setError("Kod panoya kopyalanamadı, elle seçip kopyalayın.");
    }
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`"${product.name}" silinsin mi? Bu işlem tüm yorumlarını da siler.`)) return;
    setActionProductId(product.id);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      setError("Ürün silinemedi.");
    } finally {
      setActionProductId(null);
    }
  }

  async function scrapeNow(product: Product) {
    setActionProductId(product.id);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/products/${product.id}/scrape`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          body?.error?.message ??
            "Tarama başarısız oldu. Bu özellik yalnızca 7/24 çalışan tarama sunucusu (worker) aktifken çalışır — worker kurulana kadar bu hata beklenen bir durumdur."
        );
      }
      await load();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Tarama başlatılamadı. Bu özellik yalnızca 7/24 çalışan tarama sunucusu (worker) aktifken çalışır."
      );
    } finally {
      setActionProductId(null);
    }
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

      <form
        onSubmit={addProduct}
        className="card"
        style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 28 }}
      >
        <div className="field" style={{ flex: "1 1 240px" }}>
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
        <div className="field" style={{ flex: "0 1 180px" }}>
          <label htmlFor="minRating">Minimum puan</label>
          <select
            id="minRating"
            className="input"
            value={newMinRating}
            onChange={(e) => setNewMinRating(e.target.value)}
          >
            <option value="">Tüm puanlar</option>
            <option value="3">3★ ve üzeri</option>
            <option value="4">4★ ve üzeri</option>
            <option value="5">Sadece 5★</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-end" }} disabled={submitting}>
          {submitting ? "Ekleniyor…" : "Ekle"}
        </button>
      </form>

      {error && <p className="alert alert-error" style={{ marginBottom: 20 }}>{error}</p>}

      <p
        style={{
          fontSize: 13,
          color: "var(--text-muted)",
          background: "var(--surface-muted)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          padding: "10px 14px",
          marginBottom: 20,
        }}
      >
        Not: &quot;Şimdi Tara&quot; yalnızca 7/24 çalışan tarama sunucusu (worker) kurulup aktif olduğunda çalışır. Worker
        kurulana kadar otomatik yorumlar periyodik zamanlanmış görevle çekilecektir.
      </p>

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
                <th>Minimum puan</th>
                <th>Sitede gösterilecek yorum</th>
                <th>Site stok kodu</th>
                <th>Son tarama</th>
                <th aria-label="işlemler"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <Fragment key={p.id}>
                <tr>
                  <td style={{ whiteSpace: "normal" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {p.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.imageUrl}
                          alt=""
                          width={36}
                          height={36}
                          style={{ borderRadius: "var(--radius-sm)", objectFit: "cover", flexShrink: 0 }}
                        />
                      )}
                      <div>
                        <div style={{ fontWeight: 500 }}>{p.name}</div>
                        <a
                          href={p.trendyolUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: 12, color: "var(--text-faint)" }}
                        >
                          trendyol.com&apos;da gör ↗
                        </a>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${p.isTracked ? "badge-success" : "badge-neutral"}`}>
                      {p.isTracked ? "Takip ediliyor" : "Durduruldu"}
                    </span>
                  </td>
                  <td>
                    <select
                      className="input"
                      style={{ height: 32, fontSize: 13, padding: "0 8px" }}
                      value={p.minRating ?? ""}
                      onChange={(e) => updateMinRating(p, e.target.value)}
                      disabled={actionProductId === p.id}
                    >
                      <option value="">Tüm puanlar</option>
                      <option value="3">3★ ve üzeri</option>
                      <option value="4">4★ ve üzeri</option>
                      <option value="5">Sadece 5★</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      className="input"
                      style={{ height: 32, fontSize: 13, padding: "0 8px", width: 72 }}
                      defaultValue={p.maxDisplayedReviews}
                      onBlur={(e) => updateMaxDisplayedReviews(p, e.target.value)}
                      disabled={actionProductId === p.id}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="input"
                      style={{ height: 32, fontSize: 13, padding: "0 8px", width: 110 }}
                      defaultValue={p.externalRef ?? ""}
                      placeholder="örn. SKU-123"
                      onBlur={(e) => updateExternalRef(p, e.target.value)}
                      disabled={actionProductId === p.id}
                    />
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>{formatDate(p.lastScrapedAt)}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <a href={`/admin/products/${p.id}/reviews`} className="btn btn-secondary btn-sm">
                        Yorumlar
                      </a>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setWidgetCodeProductId(widgetCodeProductId === p.id ? null : p.id)}
                      >
                        Widget kodu
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => scrapeNow(p)} disabled={actionProductId === p.id}>
                        {actionProductId === p.id ? "Taranıyor…" : "Şimdi Tara"}
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => toggleTracked(p)} disabled={actionProductId === p.id}>
                        {p.isTracked ? "Durdur" : "Başlat"}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteProduct(p)} disabled={actionProductId === p.id}>
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
                {widgetCodeProductId === p.id && (
                  <tr>
                    <td colSpan={7} style={{ background: "var(--surface-muted)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <code
                          style={{
                            fontSize: 12,
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-sm)",
                            padding: "6px 10px",
                            flex: "1 1 320px",
                            overflowX: "auto",
                          }}
                        >
                          {widgetSnippet(p)}
                        </code>
                        <button className="btn btn-secondary btn-sm" onClick={() => copyWidgetSnippet(p)}>
                          {copiedProductId === p.id ? "Kopyalandı ✓" : "Kopyala"}
                        </button>
                      </div>
                      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                        Bu kodu müşterinin sitesinde yorumların görünmesini istediğiniz yere yapıştırın.
                      </p>
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
