-- Multi-currency plan pricing: USD columns rename to make room for
-- independent (non-FX-converted) BRL/MXN prices, admin-set per plan in BMS.
DO $$
BEGIN

  -- ── subscriptions: price/monthlyPrice → *_usd, add BRL/MXN ─────────────────
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='subscriptions' AND column_name='price'
  ) THEN
    ALTER TABLE "subscriptions" RENAME COLUMN "price" TO "price_usd";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='subscriptions' AND column_name='monthly_price'
  ) THEN
    ALTER TABLE "subscriptions" RENAME COLUMN "monthly_price" TO "monthly_price_usd";
  END IF;

  ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "price_brl" DECIMAL(10, 2);
  ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "monthly_price_brl" DECIMAL(10, 2);
  ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "price_mxn" DECIMAL(10, 2);
  ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "monthly_price_mxn" DECIMAL(10, 2);

  -- ── subscriptions: stripeAnnual/MonthlyPriceId → *_usd, add BRL/MXN ────────
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='subscriptions' AND column_name='stripe_annual_price_id'
  ) THEN
    ALTER TABLE "subscriptions" RENAME COLUMN "stripe_annual_price_id" TO "stripe_annual_price_id_usd";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='subscriptions' AND column_name='stripe_monthly_price_id'
  ) THEN
    ALTER TABLE "subscriptions" RENAME COLUMN "stripe_monthly_price_id" TO "stripe_monthly_price_id_usd";
  END IF;

  -- Postgres doesn't rename the backing unique index when a column renames.
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='subscriptions_stripe_annual_price_id_key') THEN
    ALTER INDEX "subscriptions_stripe_annual_price_id_key" RENAME TO "subscriptions_stripe_annual_price_id_usd_key";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='subscriptions_stripe_monthly_price_id_key') THEN
    ALTER INDEX "subscriptions_stripe_monthly_price_id_key" RENAME TO "subscriptions_stripe_monthly_price_id_usd_key";
  END IF;

  ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "stripe_annual_price_id_brl" TEXT;
  ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "stripe_monthly_price_id_brl" TEXT;
  ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "stripe_annual_price_id_mxn" TEXT;
  ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "stripe_monthly_price_id_mxn" TEXT;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='subscriptions_stripe_annual_price_id_brl_key') THEN
    CREATE UNIQUE INDEX "subscriptions_stripe_annual_price_id_brl_key" ON "subscriptions"("stripe_annual_price_id_brl");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='subscriptions_stripe_monthly_price_id_brl_key') THEN
    CREATE UNIQUE INDEX "subscriptions_stripe_monthly_price_id_brl_key" ON "subscriptions"("stripe_monthly_price_id_brl");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='subscriptions_stripe_annual_price_id_mxn_key') THEN
    CREATE UNIQUE INDEX "subscriptions_stripe_annual_price_id_mxn_key" ON "subscriptions"("stripe_annual_price_id_mxn");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='subscriptions_stripe_monthly_price_id_mxn_key') THEN
    CREATE UNIQUE INDEX "subscriptions_stripe_monthly_price_id_mxn_key" ON "subscriptions"("stripe_monthly_price_id_mxn");
  END IF;

  -- ── app_sales: which real Stripe currency this sale was charged in ────────
  ALTER TABLE "app_sales" ADD COLUMN IF NOT EXISTS "currency" TEXT;

  -- Every live Stripe-backed sale today is USD (multi-currency didn't exist
  -- before this migration) — deterministic backfill, not a guess.
  UPDATE "app_sales" SET "currency" = 'USD'
  WHERE "stripe_subscription_id" IS NOT NULL AND "currency" IS NULL;

END $$;

-- Real per-currency prices for PREMIUM, decided by the product owner.
-- Annual USD moved from $23.99 to $29.90 (10x-monthly pattern, same as
-- BRL/MXN below) — since Stripe Prices are immutable, the now-stale USD
-- annual Price id is cleared so the next "Sync with Stripe" in BMS mints a
-- fresh one. Monthly USD is unchanged, so its Price id is left alone.
UPDATE "subscriptions" SET
  "price_usd"          = 29.90,
  "monthly_price_usd"  = 2.99,
  "price_brl"          = 149.90,
  "monthly_price_brl"  = 14.99,
  "price_mxn"          = 499.90,
  "monthly_price_mxn"  = 49.99,
  "stripe_annual_price_id_usd" = NULL
WHERE "code" = 'PREMIUM';
