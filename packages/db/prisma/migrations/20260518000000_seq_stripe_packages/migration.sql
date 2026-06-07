-- BIG REVIEW Fase 3: Stripe real for SEQ QR Packages.
-- Adds Stripe references to Package (provisioned by seed-stripe-packages.ts),
-- Tenant (one Stripe Customer per funeral home), and Sale (idempotency keys
-- and traceability for one-time checkout sessions).
-- All columns are nullable so existing rows survive without a backfill.

ALTER TABLE "packages"
  ADD COLUMN IF NOT EXISTS "stripe_product_id" TEXT,
  ADD COLUMN IF NOT EXISTS "stripe_price_id"   TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "packages_stripe_product_id_key"
  ON "packages"("stripe_product_id");
CREATE UNIQUE INDEX IF NOT EXISTS "packages_stripe_price_id_key"
  ON "packages"("stripe_price_id");

ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "stripe_customer_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "tenants_stripe_customer_id_key"
  ON "tenants"("stripe_customer_id");

ALTER TABLE "sales"
  ADD COLUMN IF NOT EXISTS "stripe_session_id"        TEXT,
  ADD COLUMN IF NOT EXISTS "stripe_payment_intent_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "sales_stripe_session_id_key"
  ON "sales"("stripe_session_id");
