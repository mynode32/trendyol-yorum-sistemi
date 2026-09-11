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
        <button type="button" className="admin-sidebar__logout" onClick={onLogout}>
          <LogoutIcon />
          <span>Çıkış Yap</span>
        </button>
      </aside>
    </>
  );
}
