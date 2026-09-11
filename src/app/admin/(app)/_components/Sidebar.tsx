"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AnalyticsIcon, LogoutIcon, LogsIcon, ProductsIcon, SettingsIcon } from "./icons";

const LINKS = [
  { href: "/admin/products", label: "Ürünler", Icon: ProductsIcon },
  { href: "/admin/analytics", label: "Analytics", Icon: AnalyticsIcon },
  { href: "/admin/scrape-logs", label: "Scraper İzleme", Icon: LogsIcon },
  { href: "/admin/settings", label: "Ayarlar", Icon: SettingsIcon },
];

type SidebarProps = {
  pathname: string;
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
};

type HealthStatus = "ok" | "degraded" | "down" | "loading";

function useCurrentAccount(): { accountName: string | null; email: string | null } {
  const [accountName, setAccountName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { accountName?: string; email?: string } | null) => {
        if (cancelled || !body) return;
        setAccountName(body.accountName ?? null);
        setEmail(body.email ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return { accountName, email };
}

function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Y";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const STATUS_LABEL: Record<HealthStatus, string> = {
  ok: "Sistem Aktif",
  degraded: "Gecikme Var",
  down: "Bağlantı Yok",
  loading: "Kontrol ediliyor…",
};

function SystemStatus() {
  const [status, setStatus] = useState<HealthStatus>("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/health")
      .then((res) => res.json())
      .then((body: { status?: string }) => {
        if (!cancelled) setStatus(body.status === "ok" || body.status === "degraded" ? body.status : "down");
      })
      .catch(() => {
        if (!cancelled) setStatus("down");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="admin-sidebar__status">
      <span className={`admin-sidebar__status-dot admin-sidebar__status-dot--${status}`} />
      <span>{STATUS_LABEL[status]}</span>
    </div>
  );
}

export function Sidebar({ pathname, open, onClose, onLogout }: SidebarProps) {
  const { accountName, email } = useCurrentAccount();

  return (
    <>
      {open && <div className="admin-sidebar__scrim" onClick={onClose} />}
      <aside className={`admin-sidebar${open ? " admin-sidebar--open" : ""}`}>
        <div className="admin-sidebar__brand">
          <span className="admin-sidebar__brand-app">Trendyol Yorum Sistemi</span>
          {accountName && <span className="admin-sidebar__brand-store">{accountName}</span>}
        </div>
        <nav className="admin-sidebar__nav">
          {LINKS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="admin-sidebar__link"
              aria-current={pathname.startsWith(href) ? "page" : undefined}
              onClick={onClose}
            >
              <Icon />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <SystemStatus />
        <div className="admin-sidebar__account">
          <div className="admin-sidebar__avatar" aria-hidden="true">
            {initialsOf(accountName || "Yönetici")}
          </div>
          <div className="admin-sidebar__account-info">
            <span className="admin-sidebar__account-name">{accountName || "Yönetici"}</span>
            <span className="admin-sidebar__account-role" title={email ?? undefined}>
              Admin Hesabı
            </span>
          </div>
        </div>
        <button type="button" className="admin-sidebar__logout" onClick={onLogout}>
          <LogoutIcon />
          <span>Çıkış Yap</span>
        </button>
      </aside>
    </>
  );
}
