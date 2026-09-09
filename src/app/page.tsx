import Link from "next/link";

export default function Home() {
  return (
    <main className="page" style={{ maxWidth: 720, paddingTop: 96 }}>
      <p
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "var(--accent)",
          marginBottom: 12,
          letterSpacing: "0.02em",
        }}
      >
        Trendyol Yorum Sistemi
      </p>
      <h1 style={{ fontSize: 34, marginBottom: 16, maxWidth: 560 }}>
        Kendi ürünlerinizin yorumlarını çekin, filtreleyin, sitenize gömün
      </h1>
      <p style={{ color: "var(--text-muted)", maxWidth: 520, fontSize: 16 }}>
        Trendyol&apos;daki ürünlerinizin gerçek müşteri yorumlarını periyodik olarak
        toplar; yıldız, tarih, fotoğraf ve metin araması ile filtrelenebilir bir API ve
        tek satırlık bir script ile gömülebilen bir widget üzerinden sunar.
      </p>

      <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
        <Link href="/admin/login" className="btn btn-primary">
          Admin paneline git
        </Link>
        <Link href="/widget-demo.html" className="btn btn-secondary">
          Widget demosunu gör
        </Link>
      </div>

      <dl
        style={{
          marginTop: 64,
          paddingTop: 32,
          borderTop: "1px solid var(--border)",
          display: "grid",
          gap: 20,
        }}
      >
        <div>
          <dt style={{ fontWeight: 600, fontSize: 14 }}>Periyodik tarama</dt>
          <dd style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 2 }}>
            Takip ettiğiniz her ürün için nazik bir hızda, her birkaç saatte bir yeni
            yorumlar otomatik olarak çekilir.
          </dd>
        </div>
        <div>
          <dt style={{ fontWeight: 600, fontSize: 14 }}>Filtrelenebilir REST API</dt>
          <dd style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 2 }}>
            Yıldız, tarih aralığı, fotoğraf ve anahtar kelimeye göre filtreleyin;
            sayfalama ve sıralama dahil.
          </dd>
        </div>
        <div>
          <dt style={{ fontWeight: 600, fontSize: 14 }}>Gömülebilir widget</dt>
          <dd style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 2 }}>
            Tek bir script etiketiyle, host sitenin stiline karışmadan yorumları
            gösterir.
          </dd>
        </div>
      </dl>
    </main>
  );
}
