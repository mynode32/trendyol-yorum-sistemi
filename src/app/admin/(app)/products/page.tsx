"use client";
import { Fragment, useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/lib/adminFetch";
import { KpiCard } from "../_components/KpiCard";
import { SettingsIcon, SortIcon } from "../_components/icons";
import { useToast } from "../_components/Toast";

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
  storeId: string | null;
  reviewGroupId: string | null;
  displayedReviewCount: number;
};

type Summary = {
  accountName: string;
  accountPlan: "LEGACY" | "STARTER" | "PRO";
  averageRating: number | null;
  newReviewsLast7Days: number;
};

function OnboardingChecklist({ products, onAddProduct }: { products: Product[]; onAddProduct: () => void }) {
  const productAdded = products.length > 0;
  const firstScrapeDone = products.some((product) => product.lastScrapedAt !== null);

  return (
    <section className="card" style={{ marginBottom: 24, maxWidth: 760 }} aria-labelledby="onboarding-title">
      <h2 id="onboarding-title" style={{ fontSize: 16, marginBottom: 4 }}>Kurulum adımları</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
        İlk ürününüzü ekleyin, planlanan taramayı bekleyin ve ardından widget kodunu sitenize yerleştirin.
      </p>
      <ol style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 20, margin: 0 }}>
        <li>
          <strong>{productAdded ? "Tamamlandı" : "Ürün ekleyin"}</strong>
          <span style={{ color: "var(--text-muted)" }}> — {productAdded ? `${products.length} ürün takipte.` : "Bir Trendyol ürün URL’si ile başlayın."}</span>
          {!productAdded && <button type="button" className="btn btn-secondary btn-sm" style={{ marginLeft: 10 }} onClick={onAddProduct}>Ürün ekle</button>}
        </li>
        <li>
          <strong>{firstScrapeDone ? "İlk tarama tamamlandı" : "İlk taramayı bekleyin"}</strong>
          <span style={{ color: "var(--text-muted)" }}> — {firstScrapeDone ? "Yorum verileri ürün listenizde görünüyor." : "Takipteki ürünler planlanan tarama sırasında işlenir."}</span>
        </li>
        <li>
          <strong>Widget kodunu yerleştirin</strong>
          <span style={{ color: "var(--text-muted)" }}> — Ürün satırındaki “Widget kodu” düğmesinden kopyalayın.</span>
        </li>
      </ol>
    </section>
  );
}

type StatusFilter = "all" | "tracked" | "stopped" | "unmatched";
type SortKey = "name" | "lastScrapedAt";
type SortDir = "asc" | "desc";

const PRODUCTS_PAGE_SIZE = 15;

function widgetStatus(p: Product): { label: string; className: string } {
  if (!p.isTracked) return { label: "Durduruldu", className: "badge-neutral" };
  if (!p.externalRef) return { label: "Eşleşme yok", className: "badge-neutral" };
  if (p.displayedReviewCount === 0) return { label: "Yorum bekleniyor", className: "badge-accent" };
  return { label: `Gösteriliyor (${p.displayedReviewCount})`, className: "badge-success" };
}

function matchesStatus(p: Product, filter: StatusFilter): boolean {
  switch (filter) {
    case "tracked":
      return p.isTracked;
    case "stopped":
      return !p.isTracked;
    case "unmatched":
      return p.isTracked && !p.externalRef;
    default:
      return true;
  }
}

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
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [newUrl, setNewUrl] = useState("");
  const [newMinRating, setNewMinRating] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionProductId, setActionProductId] = useState<string | null>(null);
  const [widgetCodeProductId, setWidgetCodeProductId] = useState<string | null>(null);
  const [settingsProductId, setSettingsProductId] = useState<string | null>(null);
  const [copiedProductId, setCopiedProductId] = useState<string | null>(null);

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRunning, setBulkRunning] = useState(false);

  async function load() {
    try {
      const res = await adminFetch("/api/admin/products");
      if (!res.ok) throw new Error();
      const body = await res.json();
      setProducts(body.data);
      setSummary(body.summary ?? null);
    } catch {
      showToast("Ürünler yüklenemedi. Sayfayı yenilemeyi deneyin.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // İlk veri yüklemesi ağ yanıtından sonra state'i günceller; kural bu async
    // yardımcıyı doğrudan effect içinde çağırmayı yine de işaretler.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredProducts = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    const filtered = products.filter(
      (p) => matchesStatus(p, statusFilter) && (!term || p.name.toLowerCase().includes(term))
    );
    if (sortKey) {
      const sorted = [...filtered].sort((a, b) => {
        if (sortKey === "name") return a.name.localeCompare(b.name, "tr");
        const aTime = a.lastScrapedAt ? new Date(a.lastScrapedAt).getTime() : 0;
        const bTime = b.lastScrapedAt ? new Date(b.lastScrapedAt).getTime() : 0;
        return aTime - bTime;
      });
      if (sortDir === "desc") sorted.reverse();
      return sorted;
    }
    // Varsayılan sırada, "Ürün serisi" (reviewGroupId) paylaşan ürünler (farklı
    // boy/beden varyantları) yan yana görünsün diye gruplanır — ürün serisi
    // olmayanlar orijinal (en yeni eklenen önce) sırasını korur.
    return [...filtered].sort((a, b) => {
      if (a.reviewGroupId && a.reviewGroupId === b.reviewGroupId) return 0;
      if (!a.reviewGroupId && !b.reviewGroupId) return 0;
      if (!a.reviewGroupId) return -1;
      if (!b.reviewGroupId) return 1;
      return a.reviewGroupId.localeCompare(b.reviewGroupId, "tr");
    });
  }, [products, searchText, statusFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PAGE_SIZE));
  const pagedProducts = useMemo(
    () => filteredProducts.slice((page - 1) * PRODUCTS_PAGE_SIZE, page * PRODUCTS_PAGE_SIZE),
    [filteredProducts, page]
  );

  function toggleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
    setPage(1);
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) =>
      prev.size === filteredProducts.length ? new Set() : new Set(filteredProducts.map((p) => p.id))
    );
  }

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
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
        showToast(body?.error?.message ?? "Ürün eklenemedi.", "error");
        return;
      }
      setNewUrl("");
      setNewMinRating("");
      showToast("Ürün eklendi.");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleTracked(product: Product) {
    setActionProductId(product.id);
    try {
      const res = await adminFetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTracked: !product.isTracked }),
      });
      if (!res.ok) throw new Error();
      showToast(product.isTracked ? "Ürün durduruldu." : "Ürün takibi başlatıldı.");
      await load();
    } catch {
      showToast("Ürün takip durumu güncellenemedi.", "error");
    } finally {
      setActionProductId(null);
    }
  }

  async function bulkSetTracked(targetTracked: boolean) {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBulkRunning(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) =>
          adminFetch(`/api/admin/products/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isTracked: targetTracked }),
          }).then((res) => {
            if (!res.ok) throw new Error();
          })
        )
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      const succeeded = ids.length - failed;
      if (failed === 0) {
        showToast(`${succeeded} ürün güncellendi.`);
      } else {
        showToast(`${succeeded}/${ids.length} başarılı, ${failed} başarısız.`, "error");
      }
      setSelectedIds(new Set());
      await load();
    } finally {
      setBulkRunning(false);
    }
  }

  async function updateMinRating(product: Product, rawValue: string) {
    const minRating = rawValue ? Number(rawValue) : null;
    setActionProductId(product.id);
    try {
      const res = await adminFetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minRating }),
      });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      showToast("Minimum puan güncellenemedi.", "error");
    } finally {
      setActionProductId(null);
    }
  }

  async function updateMaxDisplayedReviews(product: Product, rawValue: string) {
    const maxDisplayedReviews = Number(rawValue);
    if (!Number.isInteger(maxDisplayedReviews) || maxDisplayedReviews < 1) return;
    setActionProductId(product.id);
    try {
      const res = await adminFetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxDisplayedReviews }),
      });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      showToast("Gösterilecek yorum sayısı güncellenemedi.", "error");
    } finally {
      setActionProductId(null);
    }
  }

  async function updateExternalRef(product: Product, rawValue: string) {
    const externalRef = rawValue.trim() ? rawValue.trim() : null;
    if (externalRef === product.externalRef) return;
    setActionProductId(product.id);
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
      showToast("Site stok kodu güncellendi.");
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Site stok kodu güncellenemedi.", "error");
    } finally {
      setActionProductId(null);
    }
  }

  async function updateStoreId(product: Product, rawValue: string) {
    const storeId = rawValue.trim() ? rawValue.trim() : null;
    if (storeId === product.storeId) return;
    setActionProductId(product.id);
    try {
      const res = await adminFetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId }),
      });
      if (!res.ok) throw new Error();
      showToast("Mağaza etiketi güncellendi.");
      await load();
    } catch {
      showToast("Mağaza etiketi güncellenemedi.", "error");
    } finally {
      setActionProductId(null);
    }
  }

  async function updateReviewGroupId(product: Product, rawValue: string) {
    const reviewGroupId = rawValue.trim() ? rawValue.trim() : null;
    if (reviewGroupId === product.reviewGroupId) return;
    setActionProductId(product.id);
    try {
      const res = await adminFetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewGroupId }),
      });
      if (!res.ok) throw new Error();
      showToast("Ürün serisi güncellendi.");
      await load();
    } catch {
      showToast("Ürün serisi güncellenemedi.", "error");
    } finally {
      setActionProductId(null);
    }
  }

  function widgetSnippet(product: Product): string {
    const apiBaseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const storeIdAttr = product.storeId ? ` data-store-id="${product.storeId}"` : "";
    return `<script src="${apiBaseUrl}/widget/widget.js" data-product-id="${product.id}"${storeIdAttr}></script>`;
  }

  async function copyWidgetSnippet(product: Product) {
    try {
      await navigator.clipboard.writeText(widgetSnippet(product));
      setCopiedProductId(product.id);
      setTimeout(() => setCopiedProductId((id) => (id === product.id ? null : id)), 2000);
    } catch {
      showToast("Kod panoya kopyalanamadı, elle seçip kopyalayın.", "error");
    }
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`"${product.name}" silinsin mi? Bu işlem tüm yorumlarını da siler.`)) return;
    setActionProductId(product.id);
    try {
      const res = await adminFetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      showToast("Ürün silindi.");
      await load();
    } catch {
      showToast("Ürün silinemedi.", "error");
    } finally {
      setActionProductId(null);
    }
  }

  const trackedCount = products.filter((p) => p.isTracked).length;
  const displayedReviewTotal = products.reduce((sum, p) => sum + p.displayedReviewCount, 0);
  const shouldShowOnboarding = summary?.accountPlan !== "LEGACY" && !products.some((p) => p.lastScrapedAt !== null);

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <h1>Ürünler</h1>
          <p className="page-header__subtitle">
            Trendyol&apos;daki ürünlerinizi takibe alın, yorumlarını yönetin.
          </p>
        </div>
      </div>

      {!loading && products.length > 0 && (
        <div className="hero-card">
          <div className="hero-card__greeting">
            <span className="hero-card__greeting-label">Hoş geldiniz</span>
            <span className="hero-card__greeting-name">{summary?.accountName ?? ""}</span>
          </div>
          <div className="hero-card__stats">
            <div className="hero-stat">
              <span className="hero-stat__value hero-stat__value--accent">
                {summary?.averageRating != null ? (
                  <>
                    ★ {summary.averageRating.toFixed(1)}
                    <span className="hero-stat__value-unit">/ 5.0</span>
                  </>
                ) : (
                  "—"
                )}
              </span>
              <span className="hero-stat__label">Ortalama Mağaza Puanı</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat__value hero-stat__value--success">
                +{summary?.newReviewsLast7Days ?? 0}
              </span>
              <span className="hero-stat__label">Son 7 Günde Yeni Yorum</span>
            </div>
          </div>
        </div>
      )}

      {!loading && shouldShowOnboarding && (
        <OnboardingChecklist products={products} onAddProduct={() => document.getElementById("trendyolUrl")?.focus()} />
      )}

      {!loading && products.length > 0 && (
        <div className="kpi-grid">
          <KpiCard label="Toplam Ürün" value={products.length} />
          <KpiCard label="Takip Edilen" value={trackedCount} />
          <KpiCard label="Sitede Gösterilen Yorum" value={displayedReviewTotal} />
        </div>
      )}

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

      {!loading && products.length > 0 && (
        <div className="filter-bar">
          <input
            className="input"
            placeholder="Ürün adına göre ara…"
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(1);
            }}
          />
          <select
            className="input filter-bar__select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              setPage(1);
            }}
          >
            <option value="all">Tüm durumlar</option>
            <option value="tracked">Takip ediliyor</option>
            <option value="stopped">Durduruldu</option>
            <option value="unmatched">Eşleşme yok</option>
          </select>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="bulk-bar">
          <span>{selectedIds.size} ürün seçildi</span>
          <div className="bulk-bar__actions">
            <button
              className="btn btn-secondary btn-sm"
              disabled={bulkRunning}
              onClick={() => bulkSetTracked(true)}
            >
              Seçilenleri Başlat
            </button>
            <button
              className="btn btn-secondary btn-sm"
              disabled={bulkRunning}
              onClick={() => bulkSetTracked(false)}
            >
              Seçilenleri Durdur
            </button>
          </div>
        </div>
      )}

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
      ) : filteredProducts.length === 0 ? (
        <div className="empty-state">
          <strong>Eşleşen ürün yok</strong>
          <p>Arama veya filtre kriterlerini değiştirmeyi deneyin.</p>
        </div>
      ) : (
        <>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 32 }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === filteredProducts.length}
                    onChange={toggleSelectAll}
                    aria-label="Tümünü seç"
                  />
                </th>
                <th className="th-sortable" onClick={() => toggleSort("name")}>
                  <span className="th-sortable__inner">
                    Ürün
                    <SortIcon direction={sortKey === "name" ? sortDir : null} />
                  </span>
                </th>
                <th>Durum</th>
                <th>Sitede yorumlar</th>
                <th>Minimum puan</th>
                <th>Sitede gösterilecek yorum</th>
                <th className="th-sortable" onClick={() => toggleSort("lastScrapedAt")}>
                  <span className="th-sortable__inner">
                    Son tarama
                    <SortIcon direction={sortKey === "lastScrapedAt" ? sortDir : null} />
                  </span>
                </th>
                <th aria-label="ayarlar"></th>
                <th aria-label="işlemler"></th>
              </tr>
            </thead>
            <tbody>
              {pagedProducts.map((p, index) => (
                <Fragment key={p.id}>
                {!sortKey && p.reviewGroupId && p.reviewGroupId !== pagedProducts[index - 1]?.reviewGroupId && (
                  <tr className="table-group-row">
                    <td colSpan={9}>Ürün serisi: {p.reviewGroupId}</td>
                  </tr>
                )}
                <tr>
                  <td data-label="Seç">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onChange={() => toggleSelected(p.id)}
                      aria-label={`${p.name} seç`}
                    />
                  </td>
                  <td className="td-stack" data-label="Ürün" style={{ whiteSpace: "normal", minWidth: 240, maxWidth: 320 }}>
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
                      <div style={{ minWidth: 0 }}>
                        <div
                          title={p.name}
                          style={{
                            fontWeight: 500,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {p.name}
                        </div>
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
                  <td data-label="Durum">
                    <span className={`badge ${p.isTracked ? "badge-success" : "badge-neutral"}`}>
                      {p.isTracked ? "Takip ediliyor" : "Durduruldu"}
                    </span>
                  </td>
                  <td data-label="Sitede yorumlar">
                    {(() => {
                      const status = widgetStatus(p);
                      return <span className={`badge ${status.className}`}>{status.label}</span>;
                    })()}
                  </td>
                  <td data-label="Minimum puan">
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
                  <td data-label="Gösterilecek yorum">
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
                  <td data-label="Son tarama" style={{ color: "var(--text-muted)" }}>{formatDate(p.lastScrapedAt)}</td>
                  <td data-label="Ayarlar">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm btn-icon"
                      title="Site stok kodu, mağaza etiketi ve ürün serisi ayarları"
                      onClick={() => setSettingsProductId(settingsProductId === p.id ? null : p.id)}
                    >
                      <SettingsIcon />
                    </button>
                  </td>
                  <td className="td-stack td-actions" data-label="İşlemler">
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
                      <button className="btn btn-secondary btn-sm" onClick={() => toggleTracked(p)} disabled={actionProductId === p.id}>
                        {p.isTracked ? "Durdur" : "Başlat"}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteProduct(p)} disabled={actionProductId === p.id}>
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
                {settingsProductId === p.id && (
                  <tr>
                    <td colSpan={9} style={{ background: "var(--surface-muted)" }}>
                      <div className="row-panel">
                        <div className="field" style={{ flex: "0 1 160px" }}>
                          <label>Site stok kodu</label>
                          <input
                            type="text"
                            className="input"
                            defaultValue={p.externalRef ?? ""}
                            placeholder="örn. SKU-123"
                            onBlur={(e) => updateExternalRef(p, e.target.value)}
                            disabled={actionProductId === p.id}
                          />
                        </div>
                        <div className="field" style={{ flex: "0 1 160px" }}>
                          <label>Mağaza etiketi</label>
                          <input
                            type="text"
                            className="input"
                            defaultValue={p.storeId ?? ""}
                            placeholder="örn. magaza-etiketi"
                            onBlur={(e) => updateStoreId(p, e.target.value)}
                            disabled={actionProductId === p.id}
                          />
                        </div>
                        <div className="field" style={{ flex: "0 1 200px" }}>
                          <label
                            title="Aynı değeri paylaşan ürünlerin yorumları birlikte (havuzlanmış) gösterilir — farklı boy/beden varyantları için kullanın."
                          >
                            Ürün serisi
                          </label>
                          <input
                            type="text"
                            className="input"
                            defaultValue={p.reviewGroupId ?? ""}
                            placeholder="örn. capella-tv-unitesi"
                            onBlur={(e) => updateReviewGroupId(p, e.target.value)}
                            disabled={actionProductId === p.id}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                {widgetCodeProductId === p.id && (
                  <tr>
                    <td colSpan={9} style={{ background: "var(--surface-muted)" }}>
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
        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              ‹ Önceki
            </button>
            <span>
              Sayfa {page} / {totalPages} · {filteredProducts.length} ürün
            </span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Sonraki ›
            </button>
          </div>
        )}
        </>
      )}
    </div>
  );
}
