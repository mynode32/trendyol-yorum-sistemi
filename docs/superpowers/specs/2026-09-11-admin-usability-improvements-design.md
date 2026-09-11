# Admin Panel Usability Improvements

## Context

Part of a larger "make the project more valuable" conversation, the user chose
low-risk, zero-marginal-cost usability work over data/AI features: the admin
panel (`src/app/admin`) has no search/filter anywhere, a 10-column Products
table crammed with rarely-used fields, no bulk actions, and full-width red
`.alert-error` banners as the only feedback mechanism (no success feedback at
all). This is scoped as its own sub-project, independent of the larger
roadmap (Review Inbox / AI / Analytics / Widget Builder / multi-store)
discussed earlier — those remain separate, not-yet-started sub-projects.

## Decisions (confirmed with user)

1. The advanced Products fields (site stok kodu / mağaza etiketi / ürün
   serisi) move into a row-level collapsible panel, not a modal — reusing the
   existing "Widget kodu" toggle pattern already in `products/page.tsx`.
2. Toasts replace the error banners entirely (success + error), not just add
   a new success-only channel.
3. Bulk actions are limited to Durdur/Başlat (track toggle) — no bulk delete,
   no bulk min-rating in this pass.
4. Review Moderation search/filter is server-side (new query params on the
   existing `GET /api/admin/products/[id]/reviews` route), because that page
   is paginated (50/page) and a product can have hundreds of reviews —
   client-side filtering of just the current page would silently miss
   results.

## New component: Toast

`src/app/admin/(app)/_components/Toast.tsx` — a `ToastProvider` (React
context) mounted once in `(app)/layout.tsx`, exposing `useToast()` with
`showToast(message: string, type: "success" | "error")`. Renders a
bottom-right stack of auto-dismissing (2.5s) toast entries, styled from the
existing CSS custom properties (`--success`/`--success-tint`,
`--danger`/`--danger-tint`).

`products/page.tsx`, `products/[id]/reviews/page.tsx`, and
`scrape-logs/page.tsx` replace their `.alert-error` usages with
`showToast(msg, "error")`, and add `showToast(msg, "success")` calls after
successful mutations (add/update/delete product, toggle hidden, bulk
actions) where there was previously no feedback at all. The two static
informational banners on the Products page (bulk-import command note, worker
schedule note) are left as-is — they aren't error/success feedback.

## Per-page changes

### Products (`products/page.tsx`)

- **Search + status filter**: a search input (matches `product.name`,
  case-insensitive) and a status `<select>` (`Tümü` / `Takip ediliyor` /
  `Durduruldu` / `Eşleşme yok`, derived from the existing `widgetStatus()`
  logic) above the table. Both filter a `useMemo`'d view of the already-fully
  -loaded `products` state — no new fetch.
- **Table simplification**: the `Site stok kodu`, `Mağaza etiketi`, and
  `Ürün serisi` columns are removed. A new "Ayarlar" icon-button column is
  added; clicking it expands a row-level panel (same pattern as the existing
  `widgetCodeProductId` toggle) containing those three fields' existing
  inputs. Table goes from 10 columns to 7 (Ürün, Durum, Sitede yorumlar, Min
  puan, Gösterilecek yorum, Son tarama, İşlemler).
- **Bulk actions**: a checkbox per row + header "select all" (applies to the
  currently filtered rows only). When ≥1 selected, an action bar appears
  above the table with "Seçilenleri Durdur" / "Seçilenleri Başlat" — each
  fires the existing PATCH endpoint per selected id via `Promise.allSettled`,
  then reloads and shows a summary toast (`"12 ürün güncellendi"` or, on
  partial failure, `"9/12 başarılı, 3 başarısız"`).
- **Sorting**: clicking the "Ürün" or "Son tarama" column headers toggles
  ascending/descending client-side sort of the filtered array. A small
  arrow indicator shows current sort column/direction.

### Product Reviews / Moderation (`products/[id]/reviews/page.tsx` +
`api/admin/products/[id]/reviews/route.ts`)

- API: add optional `search` (matches `comment` or `authorName`,
  case-insensitive `contains`) and `rating` (exact match, 1-5) query params,
  applied in the Prisma `where` clause alongside the existing `productId`
  filter. Invalid/out-of-range `rating` values are ignored rather than
  erroring, to keep the endpoint forgiving.
- Frontend: a search input + rating `<select>` above the list; changing
  either resets `page` to 1 and refetches.

### Scrape Logs (`scrape-logs/page.tsx`)

- Client-side only (all ≤100 rows are already loaded in one fetch): a search
  input (matches `product.name`) and a status `<select>`
  (`Tümü`/`Başarılı`/`Başarısız`), filtering a `useMemo`'d view of the
  already-loaded `logs` array.

## Testing

- Extend `src/app/api/admin/products/[id]/reviews/route.test.ts` with cases
  for the new `search` and `rating` query params (match, no-match, and an
  invalid `rating` value being ignored rather than erroring).
- No new component-level tests planned — the project's existing pattern only
  unit-tests API routes and pure functions, not React components. After
  implementation: `npm run test`, `npm run lint`, and a manual browser
  walkthrough (search, filter, bulk actions, sort, toasts, both light and
  dark color-scheme) before calling this done.

## Out of scope

Bulk delete, bulk min-rating edit, cross-product Review Inbox, AI features,
analytics, multi-store — all separate, not-yet-started sub-projects from the
earlier roadmap conversation.
