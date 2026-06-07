# Phase 4 — Single-schema consolidation (`@genealogiq/db`)

Status: **PLAN / not yet executed.** Scope (updated): **all three apps — BMS, SEQ and APP —
share one Prisma schema** in `@genealogiq/db`. APP stays distinct only in UI/design, not in the
data layer. All three already point at the same Neon database, so one schema is the correct model.
The canonical schema is the **superset** (APP's models) reconciled to the real DB.

> ## ⚠️ Approach change forced by a real conflict
> While checking APP I found `apps/app/src/actions/billing.ts` does
> `prisma.subscription.findUnique({ select: { stripeAnnualPriceId, stripeMonthlyPriceId }})`,
> but **no migration in the shared history ever creates** `subscriptions.stripe_annual_price_id`
> / `stripe_monthly_price_id` / `stripe_product_id`. So the three `schema.prisma` files have
> drifted from the migration history in **both** directions — they declare columns the migrations
> never created, *and* the DB may hold columns the migrations never recorded (manual/console DDL).
>
> Conclusion: **hand-reconciling the three files against the migration SQL is not safe.** The only
> authoritative source is the **live database**. Phase 4 must derive the canonical schema by
> introspecting it: `npx prisma db pull` against a Neon snapshot/branch. That resolves every
> divergence below definitively (taxId uniqueness, audit columns, *and* the subscription Stripe
> columns) in one shot, instead of guessing per-field.

---

## The single most important finding

The Prisma **migration histories are byte-identical across all three apps**:

```
sha256(bms/prisma/migrations)  = a7279a96…21e6e
sha256(seq/prisma/migrations)  = a7279a96…21e6e   ← identical
sha256(app/prisma/migrations)  = a7279a96…21e6e   ← identical
```

Consequences:

1. **The database state is unambiguous.** There is exactly one true DDL history, already
   applied to the Neon DB. The migration SQL — not any one `schema.prisma` — is ground truth.
2. **Phase 4 needs NO new migration and NO data change.** It is a *pure code refactor*:
   collapse three drifted `schema.prisma` files into one correct one and re-point the Prisma
   clients. Nothing is written to the DB. This is far lower-risk than a normal schema migration.
3. **The three `schema.prisma` files have each silently drifted from the DB in different
   directions** — they declare columns/constraints that the migrations never created (or omit
   ones they did). Today's per-app Prisma clients are therefore each slightly *wrong*.
   Consolidating to a schema derived from the migration SQL makes the client **more** correct
   than any app is today, while removing the triplication.

---

## Divergence reconciliation (BMS ↔ SEQ → canonical)

Each row resolved against the migration SQL (the DB), then cross-checked against source usage
to confirm the change breaks nothing.

| # | Model.field | BMS today | SEQ today | DB truth (migration SQL) | Canonical | Source-safety check |
|---|---|---|---|---|---|---|
| 1 | `Supplier.taxId` uniqueness | global `@unique` | scoped `@@unique([tenantId, taxId])` | global `suppliers_tax_id_key` **dropped** in `20260517030000`; composite `suppliers_tenant_id_tax_id_key` created in `20260415000000` | **scoped** (SEQ) | BMS dedups via `supplier.findFirst({where:{taxId}})` — `findFirst` needs no unique → safe |
| 2 | `Tenant.taxId` uniqueness | `@unique` | plain | **no** `tenants_tax_id` index in any migration | **plain** (SEQ) | BMS dedups via `tenant.findFirst({where:{taxId}})` → safe |
| 3 | Audit FKs on `Supplier` / `SupplierCategory` (`createdBy`/`createdById`/`updatedBy`/`updatedById`) + back-relations on `User` | absent | present | columns **never created** in any migration | **absent** (BMS) | SEQ source has **zero** references to these fields → dead schema, safe to drop |
| 4 | `Subscription.stripeProductId` / `stripeMonthlyPriceId` / `stripeAnnualPriceId` | present | absent | columns **never created** (only `packages.stripe_product_id`, `tenants.stripe_customer_id`, `sales.stripe_*` exist) | **absent** (SEQ) | No source references the Subscription-level fields (BMS `stripeProductId` usage is all on `Package`) → safe to drop |
| 5 | `PhysicalQrLicense.id` | `@id` (no default) | `@id @default(cuid())` | `id TEXT NOT NULL`, **no DB default** | **`@id @default(cuid())`** | both `createMany` callers pass `id` explicitly (`crypto.randomUUID()`); default is a harmless safety net → safe |
| 6 | App-domain models (`AppUser`, `AppSale`, `Geolocation`, `QrCode`, `QrScan`, `StripeEvent`, enums…) | mostly absent | present | tables **exist** in DB | **superset = include** | BMS simply won't query them; extra client types are inert |

**Net:** the canonical schema ≈ **SEQ's schema, minus the phantom audit fields (#3)**. BMS gains
the app-domain models (inert) and loses three phantom constraints/fields (#1, #2, #4) that its
code never relied on. Every removal was confirmed unused by grep, so no app code changes are
forced by the schema change itself.

> **APP note (out of scope, but flagged):** APP shares the same DB and carries the *same* phantom
> drift as BMS for #1, #2, #4 (global `@unique` on Supplier/Tenant taxId; Subscription stripe
> fields). These are latent — `findUnique`/selects on non-existent constraints/columns would fail
> at runtime. Recommend a follow-up pass to align APP to the same canonical even though it keeps
> its own (superset) schema file. Tracked as a separate cleanup, not part of this phase.

---

## Target package layout

```
packages/db/
  prisma/
    schema.prisma          # the canonical schema (SEQ-derived, reconciled)
    migrations/            # the single shared history (identical copy)
  src/
    index.ts               # export { prisma } singleton + re-export generated types
    generated/             # prisma client output (gitignored or committed per repo convention)
  package.json             # name "@genealogiq/db", exports "." , scripts: prisma generate
```

`apps/bms` and `apps/seq`:
- delete local `prisma/schema.prisma` + `src/generated/prisma`
- import the client/types from `@genealogiq/db`
- add `@genealogiq/db` to `transpilePackages`
- keep their own `.env`/`DATABASE_URL` (one DB, one URL)

APP is untouched.

---

## Staged execution order (each stage independently revertable on the branch)

0. **Get DB ground truth (you run this — I have no DB creds).** Create a Neon snapshot, branch
   from it, point `DATABASE_URL` at the branch, run `npx prisma db pull` to a scratch
   `schema.prisma`, and share/commit the result. This becomes the authoritative column set that
   settles the subscription-Stripe conflict and every other divergence.
1. **Scaffold** `packages/db` with the canonical schema (= the introspected schema, plus relation
   names / `@@map` niceties that `db pull` drops) and a copy of the shared `migrations/`.
   `prisma generate` → confirm client builds.
2. **Re-point SEQ** to `@genealogiq/db` (smaller delta — canonical is SEQ-derived). Run SEQ
   typecheck + lint + Vitest. Fix any import paths.
3. **Re-point BMS** to `@genealogiq/db`. Run BMS typecheck + lint + Vitest. BMS gains inert
   models; the three phantom-field removals require no code edits (confirmed).
4. **Parity check** now becomes a no-op for BMS/SEQ (one schema). Update
   `scripts/check-schema-parity.mjs` to compare APP-vs-`@genealogiq/db` only.
5. **Build all** + push branch → **Vercel preview** → visual check (DB-touching paths: supplier
   create/dedup, package buy, physical-QR issue) → **merge**.

---

## Hard prerequisites before executing

1. **Merge the Phase 3 branch (`chore/phase-3-shared-core`) first.** Phase 4 builds on
   `@genealogiq/core` and `@genealogiq/ui` being on `main`; branching Phase 4 off un-merged
   Phase 3 risks a tangled rebase.
2. **Take a Neon snapshot before merge.** Even though Phase 4 issues no DDL, snapshot first as
   standard practice for any change that *touches the data layer's wiring*.
3. **The DB itself needs no action from me.** No migration runs, no `migrate resolve` needed —
   the history is already applied and unchanged. (I have no DB credentials in this environment
   regardless; nothing here requires them.)

---

## Risk summary

| Risk | Level | Mitigation |
|---|---|---|
| DB data/DDL change | **none** | no migration is generated or run |
| App code breakage from removed fields | **very low** | every removal confirmed unused by grep |
| Prisma client import churn | medium | done one app at a time, typecheck-gated |
| Tailwind/preview regressions | n/a | no UI change in this phase |
| Branch tangle | medium | merge Phase 3 first (prereq #1) |
