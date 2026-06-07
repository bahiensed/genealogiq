-- Migrate coupon scope from Subscription to Package.
-- Idempotent: safe to re-run.

-- Drop old join table (may not exist if no coupons were created yet)
DROP TABLE IF EXISTS "_CouponSubscriptions";

-- Create new join table
CREATE TABLE IF NOT EXISTS "_CouponPackages" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "_CouponPackages_AB_unique" ON "_CouponPackages"("A", "B");
CREATE INDEX IF NOT EXISTS "_CouponPackages_B_index" ON "_CouponPackages"("B");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = '_CouponPackages_A_fkey'
  ) THEN
    ALTER TABLE "_CouponPackages"
      ADD CONSTRAINT "_CouponPackages_A_fkey"
        FOREIGN KEY ("A") REFERENCES "discount_coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = '_CouponPackages_B_fkey'
  ) THEN
    ALTER TABLE "_CouponPackages"
      ADD CONSTRAINT "_CouponPackages_B_fkey"
        FOREIGN KEY ("B") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
