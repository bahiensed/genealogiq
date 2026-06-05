-- Idempotent: aligns token tables so they can reference both User (BMS/SEQ
-- operators) and AppUser (APP end users). Production already has these
-- changes from prior db push; guards make this safe to re-run anywhere.
--
-- The app_user_id columns were added previously without a FK constraint, so
-- there may be orphan rows pointing at deleted AppUsers. Clean those before
-- attaching the FK.

ALTER TABLE "password_reset_tokens"
  ALTER COLUMN "user_id" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "app_user_id" TEXT;

-- Stale tokens whose target AppUser no longer exists are useless (no account
-- to reset). Drop them before the FK is enforced.
DELETE FROM "password_reset_tokens"
WHERE  "app_user_id" IS NOT NULL
  AND  "app_user_id" NOT IN (SELECT "id" FROM "app_users");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'password_reset_tokens_app_user_id_fkey'
  ) THEN
    ALTER TABLE "password_reset_tokens"
      ADD CONSTRAINT "password_reset_tokens_app_user_id_fkey"
      FOREIGN KEY ("app_user_id") REFERENCES "app_users"("id") ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE "email_tokens"
  ALTER COLUMN "user_id" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "app_user_id" TEXT;

DELETE FROM "email_tokens"
WHERE  "app_user_id" IS NOT NULL
  AND  "app_user_id" NOT IN (SELECT "id" FROM "app_users");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'email_tokens_app_user_id_fkey'
  ) THEN
    ALTER TABLE "email_tokens"
      ADD CONSTRAINT "email_tokens_app_user_id_fkey"
      FOREIGN KEY ("app_user_id") REFERENCES "app_users"("id") ON DELETE CASCADE;
  END IF;
END $$;
