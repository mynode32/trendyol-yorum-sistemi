"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push("/admin/products");
        return;
      }
      const body = await res.json().catch(() => null);
      setError(
        body?.error?.code === "RATE_LIMITED"
          ? "Çok fazla başarısız deneme. Lütfen birkaç dakika sonra tekrar deneyin."
          : "Şifre hatalı."
      );
    } catch {
      setError("Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <form onSubmit={handleSubmit} className="card" style={{ width: "100%", maxWidth: 360 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--accent)", marginBottom: 4 }}>
          Trendyol Yorum Sistemi
        </p>
        <h1 style={{ fontSize: 20, marginBottom: 20 }}>Admin Girişi</h1>

        <div className="field">
          <label htmlFor="password">Şifre</label>
          <input
            id="password"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoFocus
            required
          />
        </div>

        {error && (
          <p className="alert alert-error" role="alert" style={{ marginTop: 14 }}>
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: 18 }} disabled={submitting}>
          {submitting ? "Giriş yapılıyor…" : "Giriş Yap"}
        </button>
      </form>
    </main>
  );
}
