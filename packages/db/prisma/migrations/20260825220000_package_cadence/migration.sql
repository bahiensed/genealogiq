-- Gives Package an annual/monthly cadence, catching it up with Subscription.
--
-- A funeral home buys a batch and either pays once for the year or pays in
-- twelve instalments — and the two are not proportional: 29.90 x 12 is not
-- 299.00. That is exactly why `monthly_price_*` is an independent column rather
-- than a derivation, and it is the same reasoning Subscription already carries.
--
-- The unprefixed `price_*` is the ANNUAL amount, so renaming the existing Stripe
-- id columns to `stripe_annual_price_id_*` puts the amounts where they belong:
-- both production rows are priced yearly in USD (29.99 and 299.90).
--
-- But the ids themselves are DROPPED, not carried over, and that is the point
-- of the UPDATE at the bottom. Any Price already minted was created by the
-- previous sync, which emitted no `recurring` block — that is what makes a
-- Stripe Price one-time. A one-time Price cannot be used in a
-- `mode: 'subscription'` checkout; Stripe rejects it outright. Keeping the id
-- would leave a product that looks synced and fails at the till.
--
-- Nulling it makes the product read "not synced" in BMS, which is exactly the
-- prompt an operator needs: re-sync mints a proper recurring Price. The
-- stripe_product_id is KEPT — Products are mutable and are reused across price
-- types, so only the Prices need reminting.
--
-- The orphaned one-time Prices stay active in Stripe, unreferenced. Nothing can
-- reach them (a Price is only ever used via an id we store), but they are worth
-- archiving in the dashboard for tidiness.
--
-- term_length defaults to 12 and is a COUNT OF MONTHS, not a flag. It doubles
-- as the annual Price's interval_count, which is why neither cadence uses
-- Stripe's `interval: 'year'`: a 6- or 18-month product then needs no special
-- case anywhere.

ALTER TABLE "packages"
  ADD COLUMN "term_length"        INTEGER NOT NULL DEFAULT 12,
  ADD COLUMN "monthly_price_usd"  DECIMAL(10,2),
  ADD COLUMN "monthly_price_brl"  DECIMAL(10,2),
  ADD COLUMN "monthly_price_mxn"  DECIMAL(10,2);

ALTER TABLE "packages" RENAME COLUMN "stripe_price_id_usd" TO "stripe_annual_price_id_usd";
ALTER TABLE "packages" RENAME COLUMN "stripe_price_id_brl" TO "stripe_annual_price_id_brl";
ALTER TABLE "packages" RENAME COLUMN "stripe_price_id_mxn" TO "stripe_annual_price_id_mxn";

ALTER INDEX "packages_stripe_price_id_usd_key" RENAME TO "packages_stripe_annual_price_id_usd_key";
ALTER INDEX "packages_stripe_price_id_brl_key" RENAME TO "packages_stripe_annual_price_id_brl_key";
ALTER INDEX "packages_stripe_price_id_mxn_key" RENAME TO "packages_stripe_annual_price_id_mxn_key";

ALTER TABLE "packages"
  ADD COLUMN "stripe_monthly_price_id_usd" TEXT,
  ADD COLUMN "stripe_monthly_price_id_brl" TEXT,
  ADD COLUMN "stripe_monthly_price_id_mxn" TEXT;

CREATE UNIQUE INDEX "packages_stripe_monthly_price_id_usd_key" ON "packages"("stripe_monthly_price_id_usd");
CREATE UNIQUE INDEX "packages_stripe_monthly_price_id_brl_key" ON "packages"("stripe_monthly_price_id_brl");
CREATE UNIQUE INDEX "packages_stripe_monthly_price_id_mxn_key" ON "packages"("stripe_monthly_price_id_mxn");

-- Every Price minted before this migration is one-time and unusable for a
-- subscription. Force a re-sync rather than fail at checkout.
UPDATE "packages"
   SET "stripe_annual_price_id_usd" = NULL,
       "stripe_annual_price_id_brl" = NULL,
       "stripe_annual_price_id_mxn" = NULL;
