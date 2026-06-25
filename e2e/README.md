# E2E (Playwright)

Smoke harness for browser-level checks. Run:

```bash
pnpm playwright install --with-deps chromium   # one-time: download the browser
pnpm test:e2e                                   # starts BMS dev (:3000) + runs e2e/*.spec.ts
```

`playwright.config.ts` boots a single app (BMS) via `webServer`. The dev server
needs the app's `.env` (at least `DATABASE_URL`, `AUTH_SECRET`) to start.

## Scope today

Only **public, read-only** pages (sign-in render, locale-cookie i18n, not-found).
We deliberately do **not** mutate data, because all three apps point at the
**production Neon DB**.

## To add authenticated / CRUD flows (follow-up)

1. Provision a **dedicated test database** (separate `DATABASE_URL`) and point the
   `webServer` env at it.
2. Add a **seed** (a test tenant + a known user with a fixed password) and a
   Playwright `storageState` / global-setup that signs that user in once.
3. Then add specs for the high-value journeys: create/edit a Customer, run a Sale,
   the sign-up → verify-email flow, etc.

Until a test DB exists, keep new specs read-only.
