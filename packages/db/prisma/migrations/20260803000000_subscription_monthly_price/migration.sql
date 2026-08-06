-- Explicit monthly price on Subscription, independent of price/termLength.
-- Nullable: existing/legacy rows without a value keep deriving the monthly
-- amount as price/termLength (unchanged behavior).
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "monthly_price" DECIMAL(10, 2);
