-- Gives Package a price per currency, catching it up with the rest of the catalogue.
--
-- Subscription and ExtraUnitPrice have carried priceUsd/priceBrl/priceMxn plus a
-- Stripe Price id each for a while; Package was the last model still holding a
-- single price and a single id. It is modelled on ExtraUnitPrice specifically —
-- the closest sibling, a one-time purchase rather than a recurring plan.
--
-- All three are nullable, and that is the feature, not laziness: a product is
-- sellable in the currencies it has a price for and simply does not appear in
-- the rest. The existing "is this synced" guard becomes per-currency.
--
-- The rename carries the two production rows across without a data migration:
-- both are priced in USD (29.99 and 299.90), so price -> price_usd is exactly
-- right. Both also have stripe_price_id NULL — neither product has ever been
-- synced — so the id rename moves nothing at all.

ALTER TABLE "packages" RENAME COLUMN "price" TO "price_usd";
ALTER TABLE "packages" ALTER COLUMN "price_usd" DROP NOT NULL;

ALTER TABLE "packages" RENAME COLUMN "stripe_price_id" TO "stripe_price_id_usd";
ALTER INDEX "packages_stripe_price_id_key" RENAME TO "packages_stripe_price_id_usd_key";

ALTER TABLE "packages"
  ADD COLUMN "price_brl"           DECIMAL(10,2),
  ADD COLUMN "price_mxn"           DECIMAL(10,2),
  ADD COLUMN "stripe_price_id_brl" TEXT,
  ADD COLUMN "stripe_price_id_mxn" TEXT;

CREATE UNIQUE INDEX "packages_stripe_price_id_brl_key" ON "packages"("stripe_price_id_brl");
CREATE UNIQUE INDEX "packages_stripe_price_id_mxn_key" ON "packages"("stripe_price_id_mxn");
