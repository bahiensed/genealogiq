# E2E (Playwright)

Browser-level tests for BMS. Two layers:

- **public** (`*.smoke.spec.ts`) — unauthenticated, read-only.
- **authenticated** (`*.crud.spec.ts`) — full create→edit→delete, signed in as a
  seeded admin, run against the Neon **`development`** branch (never prod).

## One-time setup

```bash
# 1. point e2e at the Neon dev branch (gitignored)
cp .env.e2e.example .env.e2e
#    edit .env.e2e: DATABASE_URL = the `development` branch connection string,
#    AUTH_SECRET = the same secret your BMS app uses locally.

# 2. install the browser
pnpm playwright install --with-deps chromium

# 3. seed the test admin into the dev branch (idempotent)
pnpm seed:e2e
```

## Run

```bash
pnpm test:e2e                       # boots BMS dev (:3000) against the dev branch + runs all specs
pnpm test:e2e --project=public      # just the public smoke tests
pnpm test:e2e e2e/packages.crud.spec.ts
```

How isolation works: `playwright.config.ts` loads `.env.e2e` and forces its
`DATABASE_URL` onto the BMS dev server via `webServer.env`. Next.js never
overrides env already in the process, so the app talks to the **dev branch**.

The `setup` project (`auth.setup.ts`) signs the seeded admin in once and writes
`e2e/.auth/user.json`; the `authenticated` project replays it.

## Adding a CRUD spec

Copy `packages.crud.spec.ts`. Reuse `helpers.ts`
(`openRowMenu`, `confirmDelete`, and `t` = the real en-US message strings). Keep
each spec **self-cleaning** (delete what it creates) so reruns stay green even
though the dev branch persists between runs.

## Notes / limits

- The dev branch is a copy of prod data; specs use unique names + clean up, so
  they never touch real-looking records destructively.
- Test creds live only in `.env.e2e` + `e2e/test-user.ts` (the password is a
  fixed local-only value); both the env file and `e2e/.auth/` are gitignored.
