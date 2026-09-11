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

export function Sidebar({ pathname, open, onClose, onLogout }: SidebarProps) {
  return (
    <>
      {open && <div className="admin-sidebar__scrim" onClick={onClose} />}
      <aside className={`admin-sidebar${open ? " admin-sidebar--open" : ""}`}>
        <span className="admin-sidebar__brand">Trendyol Yorum Sistemi</span>
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
