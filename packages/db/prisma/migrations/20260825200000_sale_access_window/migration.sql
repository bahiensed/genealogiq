-- Gives a Sale a period, so its GenCodes can have a shelf life.
--
-- A funeral home buys a batch and may use it for a term; unused codes stop
-- being activatable when that term ends. The window lives on the SALE, not on
-- each GenCode, because the whole batch moves together — if the tenant falls
-- behind on an instalment every code freezes, and when they catch up every code
-- reopens. As a column on GenCode that would mean rewriting 200 rows on every
-- monthly `customer.subscription.updated`; here it is one field on one row,
-- exactly as AppSale.currentPeriodEnd already works for the consumer side.
--
-- access_ends_at NULL means NO TERM, not a broken row. That is the opposite of
-- AppSale, where a null period end is a defect, and it is deliberate: it keeps
-- any sale written before cadence existed redeemable forever.
--
-- status holds whatever Stripe reports, uninterpreted. Freezing an unpaid
-- tenant's stock is a read-time consequence of that value, not a state this
-- system writes — which is why no sweeper is needed, and why the stock reopens
-- by itself the moment Stripe says `active` again.
--
-- Nothing to backfill: sales and gencodes are both empty in production.

ALTER TABLE "sales"
  ADD COLUMN "cadence"                 TEXT,
  ADD COLUMN "status"                  TEXT,
  ADD COLUMN "access_ends_at"          TIMESTAMP(3),
  ADD COLUMN "stripe_subscription_id"  TEXT;

CREATE UNIQUE INDEX "sales_stripe_subscription_id_key" ON "sales"("stripe_subscription_id");
