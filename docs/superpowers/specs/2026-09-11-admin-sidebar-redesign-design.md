# Admin Panel Sidebar + KPI Redesign

## Context

Admin panel (`src/app/admin`) currently uses a horizontal top nav and plain table/form layouts styled with the project's existing CSS custom-property system (`src/app/globals.css` — warm orange/cream palette, no Tailwind, no icon library). The user shared HTML mockups of an unrelated "Ideasoft Pazaryeri Yorum Sync" product (Tailwind + Material Design 3 tokens, sidebar+topbar layout, KPI cards). Goal: adopt the mockup's *layout ideas* (sidebar nav, KPI summary cards) without importing its color system, fake features (product matching, multi-marketplace, setup wizard, moderation AI banner), or new dependencies (Tailwind, Material Symbols font).

## Decisions (confirmed with user)

1. **Design system:** Keep existing CSS variables in `globals.css`. No Tailwind, no new color palette.
2. **Nav structure:** Replace horizontal top nav with a fixed left sidebar + slim topbar.
3. **Icons:** Small inline SVG components, no external icon font.
4. **KPI cards:** Yes, but only backed by data the pages already fetch — no invented metrics.

## Components

New directory: `src/app/admin/(app)/_components/`

- `Sidebar.tsx` — client component, brand label, nav links (Ürünler, Scraper İzleme) using `usePathname` for active state, logout button in footer.
- `Topbar.tsx` — slim bar with page context and (on narrow viewports) a hamburger toggle for the sidebar. No search input (no backing API — would be decorative/misleading).
- `icons.tsx` — inline SVG icon components: `ProductsIcon`, `LogsIcon`, `LogoutIcon`, `MenuIcon`.
- `KpiCard.tsx` — reusable stat card: `{ label: string; value: string | number }`.

`src/app/admin/(app)/layout.tsx` is rewritten to render `Sidebar` + `Topbar` + content area, replacing the current `admin-nav` markup.

## Styling

`globals.css`: add `.admin-sidebar`, `.admin-sidebar__link`, `.admin-topbar`, `.admin-content`, `.kpi-grid`, `.kpi-card` rules built from existing tokens (`--accent`, `--surface`, `--border`, `--radius-*`). Remove the now-unused `.admin-nav*` rules. Widen the admin content container (new `.admin-page` class, e.g. `max-width: 1200px`) since the public-site `.page` class (max-width 960px) stays untouched for `src/app/page.tsx`.

Responsive: sidebar is off-canvas below 768px, toggled via the topbar hamburger button.

## Per-page changes

- **`products/page.tsx`:** Add a 3-card KPI row above the existing add-product form, computed from the already-loaded `products` array (no new fetch): Toplam Ürün (`products.length`), Takip Edilen (`products.filter(p => p.isTracked).length`), Sitede Gösterilen Yorum (`sum(p.displayedReviewCount)`). Table/form logic unchanged.
- **`products/[id]/reviews/page.tsx`:** Replace the plain subtitle text with a single KPI card showing total review count (`pagination.total`, already fetched). No hidden/shown split — paginated data (50/page) can't represent that accurately across all pages.
- **`scrape-logs/page.tsx`:** Add a 3-card KPI row computed from the already-loaded `logs` array (last 100, matches existing page subtitle): Başarılı (`status === "success"` count), Başarısız (`status === "failed"` count), Toplam Yeni Yorum (`sum(newReviews)`).
- **`admin/login/page.tsx`:** No changes — sidebar only renders inside the authenticated `(app)` layout.

## Testing

Manual verification only (no test suite change needed — this is a visual/layout change with no new business logic). After implementation: `npm run dev`, walk through login → products (empty and populated states) → product reviews → scrape logs, at both desktop and narrow (<768px) widths, confirm sidebar toggle works and KPI numbers match the underlying data.

## Out of scope

Product matching, multi-marketplace connections, setup wizard, moderation rule banners, widget live-preview customization — none of these exist in the current product and are not being added.
