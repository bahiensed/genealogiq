-- Reconcile the live database with the canonical schema so that
-- `prisma migrate diff --from-config-datasource --to-schema schema.prisma`
-- reports no difference. Two long-standing deviations are closed here:
--
--   1. _CouponPackages (implicit M2M join table): older Prisma created a
--      UNIQUE index on (A, B); current Prisma expects a composite PRIMARY KEY.
--      Functionally equivalent — A/B are already NOT NULL and the unique index
--      guarantees no duplicate pairs, so the PK builds cleanly, then the now
--      redundant unique index is dropped.
--
--   2. subscriptions.max_profiles / term_length / price: the schema treats
--      these as required (the generated client already types them non-null),
--      but the columns were nullable in the DB. Verified 0 NULL rows before
--      enforcing NOT NULL.

-- 1. _CouponPackages: convert UNIQUE index -> composite PRIMARY KEY
ALTER TABLE "_CouponPackages" ADD CONSTRAINT "_CouponPackages_AB_pkey" PRIMARY KEY ("A", "B");
DROP INDEX IF EXISTS "_CouponPackages_AB_unique";

-- 2. subscriptions: enforce NOT NULL on required columns
ALTER TABLE "subscriptions" ALTER COLUMN "max_profiles" SET NOT NULL,
ALTER COLUMN "term_length" SET NOT NULL,
ALTER COLUMN "price" SET NOT NULL;
