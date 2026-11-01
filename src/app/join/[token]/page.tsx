"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Invite = { email: string; accountName: string; plan: "STARTER" | "PRO" };

const PLAN_LABEL: Record<Invite["plan"], string> = { STARTER: "Başlangıç", PRO: "Pro" };

export default function JoinPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = params.token;
    if (!token) return;
    fetch(`/api/onboarding/invites/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((body: Invite | null) => {
        setInvite(body);
        if (!body) setError("Bu davet geçersiz, kullanılmış veya süresi dolmuş.");
      })
      .catch(() => setError("Davet bilgileri alınamadı."))
      .finally(() => setLoading(false));
  }, [params.token]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/onboarding/invites/${encodeURIComponent(params.token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error?.message ?? "Hesap oluşturulamadı.");
        return;
      }
      router.replace("/admin/products");
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <section className="card" style={{ width: "100%", maxWidth: 420 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--accent)", marginBottom: 4 }}>Trendyol Yorum Sistemi</p>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>Hesabınızı Oluşturun</h1>

        {loading ? <div className="skeleton" style={{ height: 110, borderRadius: "var(--radius-md)" }} /> : invite ? (
          <form onSubmit={submit}>
            <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 18 }}>
              <strong>{invite.accountName}</strong> hesabı için {invite.email} adresine davet edildiniz. Planınız: {PLAN_LABEL[invite.plan]}.
            </p>
            <div className="field" style={{ marginBottom: 14 }}>
              <label htmlFor="password">Şifre</label>
              <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} minLength={12} required autoFocus />
            </div>
            <div className="field">
              <label htmlFor="confirmPassword">Şifre (tekrar)</label>
              <input id="confirmPassword" type="password" className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={12} required />
            </div>
            {error && <p className="alert alert-error" role="alert" style={{ marginTop: 14 }}>{error}</p>}
            <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: 18 }} disabled={submitting}>
              {submitting ? "Hesap oluşturuluyor…" : "Hesabı Oluştur"}
            </button>
          </form>
        ) : <p className="alert alert-error" role="alert">{error}</p>}
      </section>
    </main>
  );
}
