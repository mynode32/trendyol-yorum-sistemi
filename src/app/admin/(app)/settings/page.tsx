"use client";
import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/adminFetch";
import { useToast } from "../_components/Toast";

type Role = "OWNER" | "ADMIN" | "VIEWER";
type AccountPlan = "LEGACY" | "STARTER" | "PRO";
type Me = { email: string; accountName: string; accountPlan: AccountPlan; role: Role };
type Member = { id: string; email: string; role: Role; createdAt: string };

const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Hesap sahibi",
  ADMIN: "Yönetici",
  VIEWER: "Görüntüleyici",
};

const PLAN_LABELS: Record<AccountPlan, { label: string; detail: string }> = {
  LEGACY: { label: "Mevcut müşteri", detail: "Ürün kotası uygulanmaz." },
  STARTER: { label: "Başlangıç", detail: "En fazla 10 takip ürünü." },
  PRO: { label: "Pro", detail: "En fazla 50 takip ürünü." },
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function SettingsPage() {
  const { showToast } = useToast();
  const [me, setMe] = useState<Me | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberPassword, setNewMemberPassword] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"ADMIN" | "VIEWER">("VIEWER");
  const [addingMember, setAddingMember] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  async function loadMembers() {
    const res = await adminFetch("/api/admin/users");
    if (!res.ok) return;
    const body = await res.json();
    setMembers(body.data);
  }

  useEffect(() => {
    adminFetch("/api/admin/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((body: Me | null) => {
        setMe(body);
        if (body?.role === "OWNER") void loadMembers();
      })
      .catch(() => {});
    // İlk veri yüklemesi ağ yanıtından sonra state'i günceller; kural bu async
    // yardımcıyı doğrudan effect içinde çağırmayı yine de işaretler.
  }, []);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("Yeni şifreler birbiriyle eşleşmiyor.", "error");
      return;
    }
    setChangingPassword(true);
    try {
      // Not adminFetch: yanlış mevcut şifre de 401 döner, oturum süresi dolmasıyla
      // karıştırıp login'e yönlendirmemek için burada düz fetch kullanılıyor.
      const res = await fetch("/api/admin/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        showToast(
          body?.error?.code === "INVALID_CREDENTIALS" ? "Mevcut şifre hatalı." : "Şifre değiştirilemedi.",
          "error"
        );
        return;
      }
      showToast("Şifre değiştirildi.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      showToast("Sunucuya bağlanılamadı.", "error");
    } finally {
      setChangingPassword(false);
    }
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setAddingMember(true);
    try {
      const res = await adminFetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newMemberEmail, password: newMemberPassword, role: newMemberRole }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        showToast(
          body?.error?.code === "CONFLICT" ? "Bu email zaten kullanımda." : "Kullanıcı eklenemedi.",
          "error"
        );
        return;
      }
      showToast("Kullanıcı eklendi.");
      setNewMemberEmail("");
      setNewMemberPassword("");
      setNewMemberRole("VIEWER");
      await loadMembers();
    } finally {
      setAddingMember(false);
    }
  }

  async function removeMember(member: Member) {
    if (!window.confirm(`"${member.email}" hesaptan çıkarılsın mı?`)) return;
    setRemovingId(member.id);
    try {
      const res = await adminFetch(`/api/admin/users/${member.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        showToast(body?.error?.message ?? "Kullanıcı silinemedi.", "error");
        return;
      }
      showToast("Kullanıcı hesaptan çıkarıldı.");
      await loadMembers();
    } finally {
      setRemovingId(null);
    }
  }

  async function updateMemberRole(member: Member, role: Role) {
    if (role === member.role) return;
    setUpdatingRoleId(member.id);
    try {
      const res = await adminFetch(`/api/admin/users/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        showToast(body?.error?.message ?? "Rol değiştirilemedi.", "error");
        return;
      }
      showToast("Kullanıcı rolü güncellendi.");
      await loadMembers();
    } finally {
      setUpdatingRoleId(null);
    }
  }

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <h1>Ayarlar</h1>
          <p className="page-header__subtitle">
            {me ? `${me.email} · ${me.accountName}` : "Hesap ve şifre ayarlarınızı yönetin."}
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24, maxWidth: 420 }}>
        <h2 style={{ fontSize: 16, marginBottom: 16 }}>Şifre Değiştir</h2>
        <form onSubmit={changePassword} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="field">
            <label htmlFor="currentPassword">Mevcut şifre</label>
            <input
              id="currentPassword"
              type="password"
              className="input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="newPassword">Yeni şifre</label>
            <input
              id="newPassword"
              type="password"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={12}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="confirmPassword">Yeni şifre (tekrar)</label>
            <input
              id="confirmPassword"
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={12}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={changingPassword}>
            {changingPassword ? "Kaydediliyor…" : "Şifreyi Değiştir"}
          </button>
        </form>
      </div>

      {me && <div className="card" style={{ marginBottom: 24, maxWidth: 420 }}>
        <h2 style={{ fontSize: 16, marginBottom: 4 }}>Planınız</h2>
        <p style={{ margin: 0, fontWeight: 600 }}>{PLAN_LABELS[me.accountPlan].label}</p>
        <p style={{ margin: "6px 0 0", color: "var(--text-muted)", fontSize: 13 }}>
          {PLAN_LABELS[me.accountPlan].detail}
        </p>
      </div>}

      {me?.role === "OWNER" && <div className="card" style={{ maxWidth: 560 }}>
        <h2 style={{ fontSize: 16, marginBottom: 4 }}>Ekip Üyeleri</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
          Bu hesaba giriş yapabilecek kişiler. Yeni birini eklerken şifreyi kendiniz belirleyip
          ilgili kişiye ayrıca iletin.
        </p>

        {members === null ? (
          <div className="skeleton" style={{ height: 60, borderRadius: "var(--radius-md)" }} />
        ) : (
          <ul style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
            {members.map((member) => (
              <li
                key={member.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "10px 12px",
                  background: "var(--surface-muted)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {member.email}
                    {me?.email === member.email && (
                      <span className="badge badge-neutral" style={{ marginLeft: 8 }}>
                        Sen
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)" }}>
                    {ROLE_LABELS[member.role]} · {formatDate(member.createdAt)} tarihinde eklendi
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <select
                    className="input"
                    aria-label={`${member.email} rolü`}
                    value={member.role}
                    onChange={(event) => void updateMemberRole(member, event.target.value as Role)}
                    disabled={updatingRoleId === member.id}
                    style={{ width: 140, padding: "5px 8px" }}
                  >
                    {Object.entries(ROLE_LABELS).map(([role, label]) => (
                      <option key={role} value={role}>{label}</option>
                    ))}
                  </select>
                  {me.email !== member.email && (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => removeMember(member)}
                      disabled={removingId === member.id}
                    >
                      Çıkar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <form
          onSubmit={addMember}
          style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}
        >
          <div className="field" style={{ flex: "1 1 200px" }}>
            <label htmlFor="newMemberEmail">Email</label>
            <input
              id="newMemberEmail"
              type="email"
              className="input"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              placeholder="ekip-arkadasi@sirket.com"
              required
            />
          </div>
          <div className="field" style={{ flex: "1 1 160px" }}>
            <label htmlFor="newMemberPassword">Şifre</label>
            <input
              id="newMemberPassword"
              type="password"
              className="input"
              value={newMemberPassword}
              onChange={(e) => setNewMemberPassword(e.target.value)}
              minLength={12}
              required
            />
          </div>
          <div className="field" style={{ flex: "1 1 140px" }}>
            <label htmlFor="newMemberRole">Rol</label>
            <select
              id="newMemberRole"
              className="input"
              value={newMemberRole}
              onChange={(event) => setNewMemberRole(event.target.value as "ADMIN" | "VIEWER")}
            >
              <option value="VIEWER">Görüntüleyici</option>
              <option value="ADMIN">Yönetici</option>
            </select>
          </div>
          <button type="submit" className="btn btn-secondary" disabled={addingMember}>
            {addingMember ? "Ekleniyor…" : "Ekle"}
          </button>
        </form>
      </div>}
    </div>
  );
}
