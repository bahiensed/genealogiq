-- Retires the DIGITAL B2B product, leaving one product: the GenCode.
--
-- The two B2B products were one row in `packages` discriminated by `type`, and
-- differed only in how stock was represented: PHYSICAL minted one serialized
-- `physical_qr_licenses` row per code, DIGITAL just incremented a per-tenant
-- counter. The counter is the degenerate case — it cannot trace a unit, record
-- a write-off, or stop a code being redeemed twice — so the serialized model
-- wins and the counter goes.
--
-- Survey taken against production before writing this (read-only):
--   qr_inventory              1 row, 38 units, 1 tenant
--   app_sales                 0 rows   <- no consumer plan was ever issued
--   packages type=DIGITAL     5 (Aereus, Argentum, Aurum, Diamond, Ad Aeternum)
--   sales -> DIGITAL packages 2, both to the internal `genealogiq.app` tenant
--   licenses on those sales   0
--   coupons on those packages 0
--   physical_qr_licenses      22 (20 AVAILABLE, 1 SOLD, 1 ACTIVATED)
--
-- The 38 units were settled with the tenant directly. The two sales are CEO/CFO
-- test rows, so nothing real is lost by deleting them — and deleting them is
-- what lets the discriminator go: with `type` dropped, five digital SKUs would
-- otherwise reappear in the single remaining catalogue as phantom physical
-- products.

-- 1. Sales first — they FK to the packages being removed. Both reference
--    DIGITAL packages and carry no licenses, so nothing cascades.
DELETE FROM "sales"
WHERE "package_id" IN (SELECT "id" FROM "packages" WHERE "type" = 'DIGITAL');

-- 2. Then the DIGITAL catalogue rows themselves.
DELETE FROM "packages" WHERE "type" = 'DIGITAL';

-- 3. The digital stock counter.
DROP TABLE IF EXISTS "qr_inventory";

-- 4. The discriminator. Every surviving package is a GenCode product, so a
--    column that can only hold one value is noise.
ALTER TABLE "packages" DROP COLUMN IF EXISTS "type";
DROP TYPE IF EXISTS "PackageType";
