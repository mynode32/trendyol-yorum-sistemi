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

const storeName = process.env.NEXT_PUBLIC_STORE_NAME?.trim();

function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Y";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
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
