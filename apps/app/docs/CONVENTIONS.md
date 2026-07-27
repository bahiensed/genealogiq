# App conventions (this app's instantiation of the suite's patterns)

Compact reference of the *choices already made* in this codebase, so future entity slices
read this instead of re-deriving conventions from scratch or from ledger prose. This is a
pre-existing, hand-built app (not scaffolded fresh by the nextjs-crud-suite) — several
suite defaults are deliberately overridden below by an established, consistent local
pattern. Where the app's own pattern conflicts with a skill's generic gold, **the app's
pattern wins**; deviations are declared once here rather than re-litigated per slice.

Derived by reading the Places module (`GeoPlace`) end-to-end — schema, migration, schema
factory, queries, actions, upload route, edit form, list client, pages — as the reference
implementation of a profile-owned, guardian-manageable, publicly-gated sub-resource.

## Identity & timestamps (schema)

- **IDs are `cuid()`, not `uuid(7)`.** Every model in `packages/db/prisma/schema.prisma`
  uses `@id @default(cuid())`. Do not switch a new model to UUIDv7 — it would be the only
  model in the schema shaped differently.
- **Timestamps**: `createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)`
  and `updatedAt DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)`
  (note: `@default(now())` is present on `updatedAt` too, not just `@updatedAt` — matches
  every recent model).
- **FK naming**: `<entity>Id String @map("<entity>_id") @db.VarChar` + explicit
  `map: "<table>_<entity>_id_fkey"` on the relation, `onDelete: Cascade, onUpdate: NoAction`
  for a profile-owned child row (the row has no meaning once the `AppUser` is gone).
- **Every FK indexed**: `@@index([ownerField], map: "<table>_<entity>_id_idx")`.
- **Table mapping**: `@@map("app_<plural>")` — the `app_` prefix is universal (shared DB
  with BMS/SEQ).

## Schema location: ONE shared file, not mirrored per app

`packages/db/prisma/schema.prisma` is the single source of truth for BMS + SEQ + APP. Never
duplicate a model definition per app. Migrations likewise live in ONE
`packages/db/prisma/migrations/` directory (the old "mirror in 3 apps" convention referenced
in old session notes is dead — confirmed no `apps/app/prisma` or `apps/bms/prisma` migration
dirs exist).

## Migrations: hand-authored, idempotent SQL

Every migration is hand-written raw SQL (not `prisma migrate dev`'s auto-diff), using:
`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, and a
`DO $$ BEGIN ALTER TABLE ... ADD CONSTRAINT ...; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
wrapper for FKs (re-runnable without erroring). Folder name:
`YYYYMMDDHHMMSS_snake_case_description`. **The agent authors the migration file and runs
`prisma generate` + `prisma validate` only — `prisma migrate deploy` against the live Neon
DB is a separate, human-triggered step**, never run by an agent in this repo.

## `ActionResult` shape (differs from generic Carlos gold)

This app's shared result type lives in `@genealogiq/core` (`packages/core/src/result.ts`),
**not** a per-app `lib/action-result.ts`, and it is a 3-helper contract, not 2:

```ts
type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; message: string }
done(message?)      // success, toast only (the common case — mirrors savePlace/deletePlace)
ok(data?, message?) // success carrying a typed payload
fail(message)        // failure with a message
```

Import `done`/`fail`/`ok`/`ActionResult` from `@genealogiq/core`. Use `done()` for
create/update/delete actions that only need a toast; reserve `ok(data)` for actions that
return something the caller consumes (e.g. a checkout URL).

## Auth / authorization (this app's own DAL — not Better Auth, not Ana's generic `authz.ts`)

- `verifySession()` from `@/lib/dal` — session guard, redirects if absent (next-auth v5).
- `canManageProfile(profile, sessionUserId)` from `@/lib/profile` — the ONE ownership rule
  for every profile-scoped mutation: `profile.id === sessionUserId` OR an **ACCEPTED**
  guardian (`guardedBy.some(g => g.guardianId === sessionUserId && g.status === "ACCEPTED")`,
  written defensively against PENDING/REJECTED rows even if the caller forgot to pre-filter).
- Mutating actions guard shape, always in this order: `verifySession()` →
  `getProfileById(profileId)` + `canManageProfile` check (→ `fail(t("<ns>.notAuthorized"))`) →
  `getXSchema(identityTranslator).safeParse(data)` (→ `fail(t("common.invalidData"))`) → the
  Prisma write. **No `requireRole`/RBAC layer, no rate limiting** on these profile-content
  actions (none of bio/geolocation/places/gallery/tribute actions rate-limit either) — skip
  Ana's `requireWithinRateLimit` unless a slice explicitly asks for it.
- Server Components read `auth()` directly (from `@/auth`) for the viewer id, not
  `verifySession()` — the public profile pages must work for an anonymous viewer.

## Public/anon gating (the two-wall system)

- `assertPublicMemorialAccess(profile, viewerId, profileId)` (`@/lib/public-profile-access`)
  is the entry gate on every `(public)/profile/[id]/**` page: memorials are always public;
  living users are public unless `isPublicProfile === false`; anonymous + not-public →
  redirect to sign-in (never a 404, to avoid existence enumeration); missing id for an
  authed viewer → `notFound()`.
- **Soft wall** — `SignupDialog` (`@/components/auth/signup-dialog`, `dismissible` prop).
  `dismissible={true}`: closable (X, ESC, outside-click), opened on click-interception (e.g.
  Gallery blocks the lightbox open when `gated`). `dismissible={false}`: hard wall, no way to
  close via the dialog itself.
- **Hard wall** — `SignupPrompt` (`@/components/auth/signup-prompt`), a bare
  `<SignupDialog dismissible={false}>` that self-opens once the anon visitor scrolls ~80% of
  the page. Rendered once, as a page-level sibling of `<main>`, gated on `{isAnon && <SignupPrompt />}`.
  Composable with the soft wall on the same page (a list can click-intercept AND
  scroll-lock — see Documents, the first slice to combine both).
- Anonymous list truncation: page fetches `take: isAnon ? ANON_<X>_LIMIT : undefined`; the
  client component takes `gated`/`hasMore` props to decide fake-vs-real "load more" and
  click-vs-open behavior. `ANON_<X>_LIMIT` is a small module-level constant (12 for
  Gallery/Documents/Places, 16 for Tributes) — not configurable, not derived from a feature flag.

## Quota convention (APP-local, always enforced — no more env flags)

**Superseded convention, for history**: quotas used to live as columns on the shared
`Subscription` table and were only enforced behind a per-feature
`process.env.<FEATURE>_ENFORCE_QUOTA === "true"` flag (`GEO_PLACES_ENFORCE_QUOTA`,
`DOCUMENTS_ENFORCE_QUOTA`) — infra shipped ready but stayed inert until a human flipped the
flag. **Both flags are gone.** Quotas are always enforced now.

- **Numbers live in `src/lib/plan-quotas.ts`**, a plain dependency-free module — `FREE`,
  `PREMIUM`, `PHYSICAL_QR` objects (`PlanQuotas` interface: `treeMaxMembers`, `bioMaxChars`,
  `mediaMaxImages`, `mediaMaxVideos`, `documentsMax`, `geoPlacesMax`, `memorialsMax`,
  `qrCodeMax`, `geolocationFullAccess`). This is deliberate independence from BMS: the shared
  `Subscription` table's own columns/pricing/naming no longer feed feature numbers at all —
  BMS can rename or reprice its own plans without this app ever needing a change.
- **`getMemorialFeatures(profileId)`** (`@/lib/subscription`, `PlanQuotas` return type, `cache()`-wrapped
  per request) resolves which of the three objects applies: `physicalQrLicense` present →
  `PHYSICAL_QR`; else, for a living profile, its own live paid `AppSale` (as buyer) → `PREMIUM`;
  for a memorial (`APP_MEMO`), **any `ACCEPTED` guardian's own live paid sale cascades** →
  `PREMIUM` (one guardian's subscription covers every memorial they manage), else a legacy
  `AppSale` assigned directly to the memorial (pre-existing BMS/SEQ bulk-slot sales) → `PREMIUM`;
  otherwise `FREE`. The DB's role has shrunk to one boolean-ish question — "does a live paid
  sale exist" — never "what numbers does this Subscription row have."
- **Combined media pool**: `mediaMaxImages`/`mediaMaxVideos` are ONE shared budget spent across
  Bio's own image, every Gallery item, and every `GeoPlace.photos` entry — computed live via
  `getCombinedMediaUsage(profileId)` (`@/queries/media-usage`), no persisted running total.
  Each contributing action/form fetches the combined usage, subtracts its OWN prior
  contribution (each of Bio/Gallery/Places replaces its entire sub-collection on every save),
  and checks the new submission against what's left (`effectiveMaxImages` in each edit form).
- **Memorial-creation limit**: one shared `getMemorialCreationStatus(guardianId)`
  (`@/lib/memorial-quota`) — do not reintroduce a hardcoded constant or a bespoke count
  elsewhere. It is deliberately separate from the pre-existing paid-slot-BINDING logic
  (`nextSale`/`maxProfiles` in `memorial.actions.ts`, which decides whether a specific new
  memorial attaches to a legacy bulk sale) — that logic still runs, just no longer gates
  whether creation is *allowed* at all.
- **QR Code quota**: no persisted count exists (access was always a per-profile boolean —
  `physicalQrLicense`/a directly-assigned `appSaleId`). `getQrQuotaStatus(guardianId, profileId)`
  (`@/lib/qr-quota`) ranks {guardian's own profile} ∪ {their `ACCEPTED` memorials} by
  `createdAt`; the first `qrCodeMax` are free, EXCEPT a profile with its own dedicated paid
  slot (`physicalQrLicense` or a live directly-assigned `AppSale` — see `isSaleLive`, exported
  from `@/lib/subscription`) is always unlocked regardless of rank. Documented as an initial
  approximation — "which QR counts as free" isn't a sticky/persisted choice yet.
- **`LimitReachedDialog`** (`@/components/limit-reached-dialog`) is the one reactive UI for
  "you hit your plan's limit" — an `AlertDialog` (mirrors the pre-existing `GeolocationGate`
  pattern), controlled via `open`/`onOpenChange` (not `AlertDialogTrigger` — the calling
  component checks the limit itself, before invoking the mutating action, then opens this).
  Contexts: `"tree" | "bio" | "documents" | "media-images" | "media-videos" | "geoPlaces" |
  "memorials" | "qrCode"`. CTA always links to `/subscriptions`; `ALLOWS_EXTRA_PURCHASE`
  (`plan-quotas.ts`) marks which quota fields (`geoPlacesMax`, `qrCodeMax`, `memorialsMax`)
  additionally mention an à la carte top-up (the purchase flow itself doesn't exist yet — this
  only affects copy). A new module hitting a hard, unambiguous "this action definitely creates
  one new unit" limit (an add-image handler, a create-new-row button) should reach for this
  dialog rather than a bespoke toast or a hidden button.
- **`UpgradeHint`** (`@/components/upgrade-hint`) is a DIFFERENT, older, passive text hint
  (always-visible near a counter, no user interaction to trigger it) — it coexists with
  `LimitReachedDialog` on purpose, not a duplicate to consolidate. Its top-tier check compares
  against `"PHYSICAL_QR"` (this and `tree-subtitle.tsx`'s equivalent check used to compare
  against a stale BMS-era code name, `"CENTURY"` — both fixed; if you find `"CENTURY"`
  anywhere else, it's the same latent bug).

## Caching model: no Cache Components, plain `revalidatePath`

This app does **not** use Next 16 Cache Components / `cacheTag` / `updateTag`. Mutating
actions call `revalidatePath(<the list route>)` (see CLAUDE.md's ARCHITECTURE RULES). Public
profile sub-pages read `auth()` per-request and are naturally dynamic — no `force-dynamic`
export is used or needed anywhere in `(public)/profile/[id]/**`.

## Form placement: ALWAYS a routed page, never a dialog — regardless of field count

Every profile sub-resource form in this app (Places, Bio, Geolocation, Memorial) is a
**routed page** (`.../new/page.tsx`, `.../[id]/edit/page.tsx`) rendered inside
`AuroraBackdrop` + a `glass-card` form, with `onSuccess` doing `router.push(list)`. **This
app does not use the suite's "≤8 fields → dialog" threshold** — Places has 8 fields
(title/categories/description/lat/lon/photos/startDate/endDate) and still gets full routed
pages, matching Bio/Geolocation/Memorial. Declared deviation from `shad-form-builder`'s
dialog-below-8 default: **always route, never dialog**, for this app's profile-content forms.

## List UI: a custom `*-client.tsx` component, not Tatiana's TanStack table

Public-profile sub-resource lists (Places, Gallery, Tributes) are **not** server-driven
TanStack tables with URL-state pagination — `tatiana-table-generator`'s pattern does not
apply to this app's public-facing content. Instead: a `'use client'` component takes the
full (or anon-truncated) row array as a prop, renders a grid/list/masonry of cards, and opens
a `<Dialog>` for the detail view. No `page`/`perPage`/`sort` URL params; the "pagination" is
either client-side (`visibleCount` + IntersectionObserver, Gallery) or just a take-limited
query with no further paging (Places, and now Documents). Empty state: an icon + translated
message + (if `isOwn`) a CTA button.

## i18n

- next-intl, **cookie**-based locale (no `[locale]` URL segment). 3 locales:
  `en-US` (default), `pt-BR`, `es-MX`.
- **Top-level namespace keys are alphabetically ordered** in each `messages/<locale>.json`
  (confirmed: `Actions, Auth, Bio, Common, Documents, Errors, FamilyTree, Favorites,
  Feedback, Gallery, Geolocation, Home, InstallPrompt, Legal, Memorialized, Messages, Nav,
  NotFound, Offline, Places, Profile, Push, Qr, Subscriptions, Tributes`) — and **keys within
  each namespace are alphabetically ordered** too (including `cat_*`/`catgroup_*` keys).
- Validation messages come from the shared `Errors` namespace (`required`, `maxChars`,
  `minChars`, `endBeforeStart`, …) via a `Translator` passed into the schema factory — a new
  entity only adds `Errors` keys if it needs a message the shared set doesn't already cover.
  `common.invalidData` (under `Actions`) is the generic server-side-validation-failed toast.
- Server-error toasts for a new entity's actions go under `Actions.<entityNamespace>.*`
  (`notAuthorized`, `notFound`, `limitReached`), alongside the sibling entities' blocks
  (`Actions.places.*`, `Actions.bio.*`, …), inserted alphabetically among Actions' top keys.
  The entity's own `<Entity>` namespace holds everything UI-facing: field labels,
  placeholders, toasts (`toasts.saved`/`deleted`/`reset`/`fixFields`/`uploadFailed`/
  `unsupportedFile`/`waitForUploads`), delete-confirm dialog copy, category labels
  (`cat_<key>`), page titles.
- Run both `node scripts/check-i18n-parity.mjs` (cross-locale key parity) AND
  `node scripts/check-i18n-keys.mjs` (double-nest + missing-namespace detection) from the
  monorepo root after touching any `messages/*.json` — both are wired as `pnpm check:i18n-parity`
  / `pnpm check:i18n-keys` at the repo root.

## Uploads (Vercel Blob)

One route per feature under `src/app/api/<feature>/upload/route.ts`, using
`@vercel/blob/client`'s `handleUpload`. Two shapes seen in this app:

- **Ownership-scoped** (profile-owned media — Places/Bio/Gallery/Tribute/**Documents**):
  `onBeforeGenerateToken` re-derives the session via `auth()`, parses+validates a
  `clientPayload` of `{ profileId }` (a small `parseClientPayload` helper that throws on
  missing/malformed JSON), loads the profile's `guardedBy` (`status: "ACCEPTED"` pre-filtered
  in the `select`), and checks `canManageProfile`. `onUploadCompleted` is a no-op unless
  content verification is needed (see below).
- **Anonymous, unscoped** (career/CV upload — public form, no owner): no
  `onBeforeGenerateToken` auth check at all, just content constraints.
- **Content verification independent of ownership**: when the accepted type is spoofable by
  a client-declared `content-type` (PDF), `onUploadCompleted` re-fetches
  `Range: bytes=0-4` and checks the magic header (`%PDF-`), calling `deleteBlobs([blob.url])`
  if it doesn't match. Documents' upload route is the first to need **both** the
  ownership check and the magic-byte check in the same route (mirrors career's PDF check +
  places' ownership check — see `src/app/api/documents/upload/route.ts`).
- `deleteBlobs(urls)` (`@/lib/blob`) always swallows its own errors — blob cleanup must never
  block or fail a DB write/delete.

## Boundary files (Bruna's step): no-op for public profile sub-segments

`(public)/loading.tsx`, `(public)/error.tsx`, `(public)/not-found.tsx` already cover every
route under `profile/[id]/**` — **no sibling module** (bio, gallery, places, tributes,
geolocation, memorialized, qr-code) has its own segment-level `loading.tsx`/`error.tsx`/
`not-found.tsx`, including ones with dedicated list+detail+edit routes. A new profile
sub-resource follows the same precedent: do not add per-segment boundary files unless a
slice explicitly asks for one. (The group-level `(public)/loading.tsx` skeleton is shaped for
the bento-grid profile page specifically, so it's a loose match for sub-pages — a
pre-existing characteristic of every sibling module, not something a new entity should fix
unilaterally.)

## Gates actually available in this repo

There is no `check-skill-contracts.mjs` here (this is not a suite-scaffolded app — no
generic `lib/action-result.ts`/`lib/list-params.ts`/`lib/authz.ts` contracts to check). The
deterministic gates that exist and apply, run from the monorepo root unless noted:

```
pnpm --filter @genealogiq/app typecheck     # tsc --noEmit
pnpm --filter @genealogiq/app lint          # eslint
pnpm --filter @genealogiq/app test          # vitest run
pnpm check:i18n-parity                       # cross-locale key parity (all apps)
pnpm check:i18n-keys                         # double-nest / missing-namespace check (all apps)
node scripts/check-schema-parity.mjs         # N/A now — single shared schema.prisma; script
                                              # predates the packages/db consolidation, kept
                                              # for history, need not be run for new entities
```

`corepack pnpm` is required on this machine — bare `pnpm` is not on `PATH`.

## Deviations from suite gold (accepted, do not re-litigate)

- **IDs**: `cuid()`, not `uuid(7)` (Priscilla's fixed convention) — whole schema is cuid.
- **`ActionResult`**: 3-helper `done`/`ok`/`fail` contract from `@genealogiq/core` with an
  optional `data` payload, not the 2-helper `ok(id)`/`fail(message)` shape in Carlos's gold.
- **No RBAC/rate-limiting layer** (Ana's `requireRole`/`requireWithinRateLimit`) on profile
  sub-resource actions — ownership (`canManageProfile`) is the only gate. Add rate limiting
  only if a slice explicitly calls for it on a specific action.
- **Caching**: plain `revalidatePath`, not Cache Components' `cacheTag`/`updateTag`.
- **Form placement**: always a routed page, never a dialog, regardless of field count.
- **No TanStack table for public content lists**: a custom `*-client.tsx` grid/list
  component instead of `tatiana-table-generator`'s table (that skill's pattern is reserved
  for — if this app ever grows one — an internal/admin CRUD table; none exists yet).
- **No per-segment boundary files** under `profile/[id]/**` — the `(public)` group-level
  ones cover every sub-route.
