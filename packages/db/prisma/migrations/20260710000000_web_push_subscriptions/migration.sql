-- Web Push (Tier 2 PWA): one row per browser push subscription (a user can
-- have several devices), plus the recipient's preferred locale on app_users —
-- push payloads are built server-side at send time, where the recipient's
-- locale cookie is not available. Idempotent so it can be re-applied safely.

CREATE TABLE IF NOT EXISTS "app_push_subscriptions" (
  "id"         TEXT         NOT NULL,
  "user_id"    TEXT         NOT NULL,
  "endpoint"   TEXT         NOT NULL,
  "p256dh"     TEXT         NOT NULL,
  "auth"       TEXT         NOT NULL,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "app_push_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "app_push_subscriptions_endpoint_key"
  ON "app_push_subscriptions" ("endpoint");

CREATE INDEX IF NOT EXISTS "app_push_subscriptions_user_id_idx"
  ON "app_push_subscriptions" ("user_id");

DO $$ BEGIN
  ALTER TABLE "app_push_subscriptions"
    ADD CONSTRAINT "app_push_subscriptions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "app_users"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Recipient locale for push payload localization (en-US | pt-BR | es-MX).
ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "preferred_locale" TEXT;
