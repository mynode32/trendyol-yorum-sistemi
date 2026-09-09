import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        maxWidth: 480,
        margin: "0 auto",
        padding: 24,
        minHeight: "70vh",
      }}
    >
      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--accent)", marginBottom: 8 }}>404</p>
      <h1 style={{ fontSize: 24, marginBottom: 10 }}>Bu sayfa bulunamadı</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>
        Aradığınız sayfa taşınmış ya da hiç var olmamış olabilir.
      </p>
      <Link href="/" className="btn btn-primary">
        Anasayfaya dön
      </Link>
    </main>
  );
}
