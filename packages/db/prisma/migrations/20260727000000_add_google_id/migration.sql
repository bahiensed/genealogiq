-- Optional Google OAuth identity on both login-capable tables (app_users for
-- APP; users for BMS/SEQ). Nullable, and deliberately NOT the sign-in lookup
-- key — "Sign in with Google" resolves the row by verified email, matching
-- Credentials' existing identity model. google_id is bookkeeping/audit only:
-- "has this row ever signed in with Google, and with which Google account."
--
-- Additive and idempotent — safe to re-apply.
ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "google_id" TEXT;
ALTER TABLE "users"     ADD COLUMN IF NOT EXISTS "google_id" TEXT;

-- Partial unique indexes, mirroring app_users_email_unique's nullable-partial-
-- unique shape (a plain UNIQUE index already permits multiple NULLs in
-- Postgres — the explicit WHERE clause is kept for the same self-documenting
-- reason the email index uses it, and so the Prisma schema's `where: raw(...)`
-- attribute matches the DB exactly, avoiding schema-drift detection).
CREATE UNIQUE INDEX IF NOT EXISTS "app_users_google_id_unique"
  ON "app_users"("google_id") WHERE ("google_id" IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS "users_google_id_unique"
  ON "users"("google_id") WHERE ("google_id" IS NOT NULL);
