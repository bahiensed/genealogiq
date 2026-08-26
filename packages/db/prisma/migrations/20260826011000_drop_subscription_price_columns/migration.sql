-- Contract half of the expand/contract started in 20260826010000.
--
-- The consumer plans' per-currency price columns are gone; their data moved to
-- plan_prices in that migration, and every reader now goes through
-- @genealogiq/services/subscription-price.
--
-- Why they had to go rather than stay as a convenience: they were MUTABLE.
-- Editing price_brl was an UPDATE, so it rewrote what every past sale had been
-- charged — the same defect that made the old Package catalogue's revenue
-- history untrustworthy, and the reason plan_prices exists. Keeping them would
-- have left two ways to price one product, with only one of them honest.
--
-- term_length stays: it is the term's LENGTH, not its price, and it still feeds
-- every cash Price's interval_count.

-- Note: the generated diff also carried DROP INDEX for each @unique column.
-- They are omitted deliberately. Prisma emits those from the SCHEMA's
-- declarations without checking the database, and two of them
-- (stripe_annual_price_id_brl/mxn) never existed there — drift the acceptance
-- gate did not catch, because `migrate diff` reported no difference. Dropping a
-- column removes its own index anyway, so the statements bought nothing and
-- failed the whole migration.

-- AlterTable
ALTER TABLE "subscriptions" DROP COLUMN "monthly_price_brl",
DROP COLUMN "monthly_price_mxn",
DROP COLUMN "monthly_price_usd",
DROP COLUMN "price_brl",
DROP COLUMN "price_mxn",
DROP COLUMN "price_usd",
DROP COLUMN "stripe_annual_price_id_brl",
DROP COLUMN "stripe_annual_price_id_mxn",
DROP COLUMN "stripe_annual_price_id_usd",
DROP COLUMN "stripe_monthly_price_id_brl",
DROP COLUMN "stripe_monthly_price_id_mxn",
DROP COLUMN "stripe_monthly_price_id_usd",
DROP COLUMN "stripe_product_id";

