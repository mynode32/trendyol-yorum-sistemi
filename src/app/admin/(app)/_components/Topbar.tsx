import { MenuIcon } from "./icons";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
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
    </header>
  );
}
