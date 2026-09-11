import { MenuIcon } from "./icons";

const TITLES: { test: (pathname: string) => boolean; label: string }[] = [
  { test: (p) => p.startsWith("/admin/products/") && p.includes("/reviews"), label: "Yorum Moderasyonu" },
  { test: (p) => p.startsWith("/admin/products"), label: "Ürünler" },
  { test: (p) => p.startsWith("/admin/scrape-logs"), label: "Scraper İzleme" },
  { test: (p) => p.startsWith("/admin/settings"), label: "Ayarlar" },
];

function titleFor(pathname: string): string {
  return TITLES.find(({ test }) => test(pathname))?.label ?? "Yönetim Paneli";
}

export function Topbar({ pathname, onMenuClick }: { pathname: string; onMenuClick: () => void }) {
  return (
    <header className="admin-topbar">
      <button
        type="button"
        className="admin-topbar__menu-btn"
        onClick={onMenuClick}
        aria-label="Menüyü aç/kapat"
      >
        <MenuIcon />
      </button>
      <span className="admin-topbar__title">{titleFor(pathname)}</span>
    </header>
  );
}
