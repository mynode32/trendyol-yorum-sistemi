# Multi-Tenant Accounts — Phase 1 (Account Model + Login)

## Context

The project is moving from a single-operator tool (one shared `ADMIN_PASSWORD`,
no user/account concept) to a real multi-tenant SaaS: each customer gets their
own `Account`, logs in with their own email/password, and only ever sees their
own data. "enwood" is the first (pilot) customer, created through the exact
same generic mechanism any future customer will use — nothing in the codebase
references "enwood" by name.

This is Phase 1 of 3 (agreed with the user):

- **Phase 1 (this spec):** Account/User data model, real password auth, the
  Products page scoped to the logged-in account. Existing production data
  (currently live at trendyol-yorum-sistemi.vercel.app) migrates safely.
- **Phase 2:** Every remaining admin API route (reviews, scrape-logs, health,
  bulk-import) enforces account-scoped authorization.
- **Phase 3:** Account management UI (profile, password change, inviting a
  second user to the same account).

## Rollout safety

Production is live with real customer data. This ships in two deploys so the
site is never in a broken/locked-out state:

1. **Step A** (this commit): add `Account` and `User` tables, plus a
   **nullable** `Product.accountId` column, plus password-hashing helpers and
   a generic `scripts/create-account.ts`. None of this changes any existing
   request path — login, Products page, everything behaves exactly as before.
   Safe to deploy immediately.
2. The user runs `scripts/create-account.ts` against production (locally,
   using their own `DIRECT_URL`) to create the first `Account` + `User` and
   backfill every existing `Product.accountId` to it.
3. **Step B** (separate commit, after the user confirms Step 2 succeeded):
   swap the login route and session to the new email/password system, remove
   the `ADMIN_PASSWORD` path, and scope the Products page/API to
   `session.accountId`.

## Data model

```prisma
model Account {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  users     User[]
  products  Product[]
}

model User {
  id           String   @id @default(cuid())
  accountId    String
  account      Account  @relation(fields: [accountId], references: [id])
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
}
```

`Product` gains `accountId String?` (nullable in Step A, backfilled by the
script, treated as required by application logic from Step B onward — not
enforced `NOT NULL` at the DB level yet, to avoid a migration that fails
against existing rows before the backfill runs). `Product.storeId` is
untouched — that's the unrelated widget-script safety tag, not a tenant key.

## Auth

- `bcryptjs` (new dependency) for password hashing — no viable pure-JS
  alternative without it.
- `src/lib/auth/session.ts`: token payload becomes `user:{userId}:{timestamp}`
  (currently `admin:{timestamp}`); `verifySessionToken` returns
  `{ userId: string } | null` instead of `boolean`. This is a Step B change
  (old tokens stop validating the moment this ships — acceptable since it
  just forces re-login).
- New `src/lib/auth/password.ts`: `hashPassword`, `verifyPassword` thin
  wrappers around bcryptjs.
- New `src/lib/auth/currentUser.ts`: given a `Request`, reads the session
  cookie, verifies it, and loads `{ user, account }` from the DB (or `null`).
  Phase 1 wires this into the login route and the Products page/API only;
  every other admin route keeps using the old boolean session check until
  Phase 2 — they still require *a* valid login, just not yet scoped to one
  account.
- `POST /api/admin/login` (Step B): body becomes `{ email, password }`,
  looks up `User` by email, verifies the hash, issues a session token
  containing that user's id. Login page UI gains an email field.

## `scripts/create-account.ts`

Generic, reusable for every future customer — no hardcoded names:

```
tsx scripts/create-account.ts <email> <password> <account-name>
```

Creates the `Account` (name = the 3rd arg), creates the `User` (email +
bcrypt-hashed password), and backfills every `Product` where `accountId` is
currently `null` to that account. Run once now (with "enwood" as the account
name) against production, and again for each future customer.

## Products page/API scoping (Step B)

`GET /api/admin/products` filters `where: { accountId: session.accountId }`.
The Products page itself doesn't change visually — it already shows "your"
products, just now provably scoped instead of showing everything in the
database.

## Explicitly out of scope for Phase 1

- Every other admin route (reviews, scrape-logs, health, bulk-import) —
  still requires login, not yet account-scoped. Phase 2.
- Signup/invite UI, profile page, password change — Phase 3.
- The public widget API (`/api/v1/**`) and the scraper worker
  (`scripts/run-scheduler.ts`) — unaffected; they operate on `Product`
  records directly and don't need to know which account owns them.
- Enforcing `Product.accountId` as `NOT NULL` at the database level —
  deferred to a later cleanup migration once Phase 2 confirms every code
  path always sets it.

## Testing

- New tests for `scripts/create-account.ts`'s core logic (account/user
  creation, backfill correctness) and for `password.ts` (hash/verify
  round-trip, wrong-password rejection).
- Extend the login route tests for the new email/password body shape.
- `npm run test`, `npm run lint`, manual browser walkthrough (new login,
  Products page shows only that account's products) before calling Step B
  done — same as every other change this session.
