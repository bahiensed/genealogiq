-- Retires the DIGITAL B2B product.
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
--   app_sales                 0 rows  <- nothing was ever sold to a consumer
--   sales (DIGITAL packages)  2
--   physical_qr_licenses      22 (20 AVAILABLE, 1 SOLD, 1 ACTIVATED)
--
-- The 38 units were settled directly with the tenant before this ran. Because
-- `app_sales` is empty, dropping this table cannot strand a consumer
-- entitlement — no consumer plan was ever issued through either channel.

-- Deactivate the DIGITAL catalogue rows rather than deleting them: `sales` rows
-- reference them and those historical B2B sales stay truthful.
UPDATE "packages" SET "is_active" = false WHERE "type" = 'DIGITAL';

DROP TABLE IF EXISTS "qr_inventory";
