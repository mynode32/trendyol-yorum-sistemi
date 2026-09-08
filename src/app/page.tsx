export default function Home() {
  return (
    <main
      style={{
        maxWidth: 640,
        margin: "80px auto",
        padding: "0 24px",
        fontFamily: "system-ui, sans-serif",
        lineHeight: 1.6,
      }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Trendyol Yorum Sistemi</h1>
      <p style={{ color: "#555" }}>
        Trendyol&apos;daki ürün yorumlarınızı otomatik olarak çeken, filtrelenebilir bir
        API ve gömülebilir bir widget üzerinden web sitenize sunan sistem.
      </p>
      <ul style={{ marginTop: 24 }}>
        <li>
          <a href="/admin/login">Admin paneline git</a> — ürün ekle, yorumları
          yönet, scraper durumunu izle
        </li>
        <li>
          <a href="/widget-demo.html">Widget demo sayfası</a>
        </li>
      </ul>
    </main>
  );
}
