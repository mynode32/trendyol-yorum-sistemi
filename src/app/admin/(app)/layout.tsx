"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { adminFetch } from "@/lib/adminFetch";

const LINKS = [
  { href: "/admin/products", label: "Ürünler" },
  { href: "/admin/scrape-logs", label: "Scraper İzleme" },
];

export default function AdminAppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await adminFetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div className="admin-shell">
      <nav className="admin-nav">
        <div className="admin-nav__inner">
          <span className="admin-nav__brand">Trendyol Yorum Sistemi</span>
          <div className="admin-nav__links">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="admin-nav__link"
                aria-current={pathname.startsWith(link.href) ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={logout}>
            Çıkış Yap
          </button>
        </div>
      </nav>
      {children}
    </div>
  );
}
