"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LogoutIcon, LogsIcon, ProductsIcon } from "./icons";

const LINKS = [
  { href: "/admin/products", label: "Ürünler", Icon: ProductsIcon },
  { href: "/admin/scrape-logs", label: "Scraper İzleme", Icon: LogsIcon },
];

type SidebarProps = {
  pathname: string;
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
};

type HealthStatus = "ok" | "degraded" | "down" | "loading";

const storeName = process.env.NEXT_PUBLIC_STORE_NAME?.trim();

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
  return (
    <>
      {open && <div className="admin-sidebar__scrim" onClick={onClose} />}
      <aside className={`admin-sidebar${open ? " admin-sidebar--open" : ""}`}>
        <div className="admin-sidebar__brand">
          <span className="admin-sidebar__brand-app">Trendyol Yorum Sistemi</span>
          {storeName && <span className="admin-sidebar__brand-store">{storeName}</span>}
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
            {initialsOf(storeName || "Yönetici")}
          </div>
          <div className="admin-sidebar__account-info">
            <span className="admin-sidebar__account-name">{storeName || "Yönetici"}</span>
            <span className="admin-sidebar__account-role">Admin Hesabı</span>
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
