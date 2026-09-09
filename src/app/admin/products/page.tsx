"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/adminFetch";

type Product = { id: string; name: string; trendyolUrl: string; isTracked: boolean; lastScrapedAt: string | null };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function load() {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/products");
      if (!res.ok) throw new Error();
      const body = await res.json();
      setProducts(body.data);
      setError(null);
    } catch {
      setError("Ürünler yüklenemedi.");
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
    load();
  }

  async function toggleTracked(product: Product) {
    await adminFetch(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isTracked: !product.isTracked }),
    });
    load();
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`"${product.name}" silinsin mi? Bu işlem tüm yorumlarını da siler.`)) return;
    await adminFetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
    load();
  }

  async function logout() {
    await adminFetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div>
      <h1>Ürün Yönetimi</h1>
      <button onClick={logout}>Çıkış Yap</button>
      <form onSubmit={addProduct}>
        <input
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="Trendyol ürün URL'si"
        />
        <button type="submit">Ekle</button>
      </form>
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <p>Yükleniyor...</p>
      ) : (
        <ul>
          {products.map((p) => (
            <li key={p.id}>
              {p.name} — {p.isTracked ? "takip ediliyor" : "durduruldu"} — son tarama:{" "}
              {p.lastScrapedAt ?? "hiç"}{" "}
              <a href={`/admin/products/${p.id}/reviews`}>Yorumları Yönet</a>{" "}
              <button onClick={() => toggleTracked(p)}>
                {p.isTracked ? "Takibi Durdur" : "Takibi Başlat"}
              </button>{" "}
              <button onClick={() => deleteProduct(p)}>Sil</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
