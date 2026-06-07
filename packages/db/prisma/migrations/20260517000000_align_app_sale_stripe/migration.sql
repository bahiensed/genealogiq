-- Idempotent migration: brings AppSale + AppUser + StripeEvent into the
-- shared canonical state (Stripe fields NULLABLE so SEQ vendor sales and
-- APP Stripe sales coexist in the same table). Most columns already exist
-- in production from earlier prisma db push runs — guards make this a
-- safe no-op there and a full setup on fresh databases.

-- 1. AppUser: Stripe customer reference (one Stripe customer per AppUser)
ALTER TABLE "app_users"
  ADD COLUMN IF NOT EXISTS "stripe_customer_id" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "app_users_stripe_customer_id_key"
  ON "app_users"("stripe_customer_id");

-- 2. AppSale: ensure Stripe columns exist and are NULLABLE
ALTER TABLE "app_sales"
  ADD COLUMN IF NOT EXISTS "stripe_subscription_id" TEXT,
  ADD COLUMN IF NOT EXISTS "stripe_price_id"        TEXT,
  ADD COLUMN IF NOT EXISTS "cadence"                TEXT,
  ADD COLUMN IF NOT EXISTS "status"                 TEXT,
  ADD COLUMN IF NOT EXISTS "current_period_end"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancel_at_period_end"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "canceled_at"            TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "ended_at"               TIMESTAMP(3);

-- Stripe fields were originally created NOT NULL via prisma db push, which
-- blocks SEQ vendor flow from inserting AppSale rows. Relax them.
ALTER TABLE "app_sales"
  ALTER COLUMN "stripe_subscription_id" DROP NOT NULL,
  ALTER COLUMN "stripe_price_id"        DROP NOT NULL,
  ALTER COLUMN "cadence"                DROP NOT NULL,
  ALTER COLUMN "status"                 DROP NOT NULL,
  ALTER COLUMN "current_period_end"     DROP NOT NULL;

-- Legacy SEQ fields (value, tenant_id, sold_by_id) should be NULLABLE so
-- APP Stripe direct purchases can omit them. Defensive no-op if already.
ALTER TABLE "app_sales"
  ALTER COLUMN "value"      DROP NOT NULL,
  ALTER COLUMN "tenant_id"  DROP NOT NULL,
  ALTER COLUMN "sold_by_id" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "app_sales_stripe_subscription_id_key"
  ON "app_sales"("stripe_subscription_id");

-- 3. StripeEvent table (webhook idempotency)
CREATE TABLE IF NOT EXISTS "stripe_events" (
  "id"         TEXT NOT NULL,
  "type"       TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stripe_events_pkey" PRIMARY KEY ("id")
);
