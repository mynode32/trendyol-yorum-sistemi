"use client";
import { useEffect, useState } from "react";

type Product = { id: string; name: string; trendyolUrl: string; isTracked: boolean; lastScrapedAt: string | null };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [newUrl, setNewUrl] = useState("");

  async function load() {
    const res = await fetch("/api/admin/products");
    const body = await res.json();
    setProducts(body.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trendyolUrl: newUrl }),
    });
    setNewUrl("");
    load();
  }

  async function toggleTracked(product: Product) {
    await fetch(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isTracked: !product.isTracked }),
    });
    load();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
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
      <ul>
        {products.map((p) => (
          <li key={p.id}>
            {p.name} — {p.isTracked ? "takip ediliyor" : "durduruldu"} — son tarama:{" "}
            {p.lastScrapedAt ?? "hiç"}{" "}
            <a href={`/admin/products/${p.id}/reviews`}>Yorumları Yönet</a>{" "}
            <button onClick={() => toggleTracked(p)}>
              {p.isTracked ? "Takibi Durdur" : "Takibi Başlat"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
