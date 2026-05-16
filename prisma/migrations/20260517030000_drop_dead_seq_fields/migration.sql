-- Drops two dead-code remnants verified as having zero usage in src/:
--  1. users.created_by_id / users.updated_by_id — audit fields that were
--     never written by any action across SEQ/BMS/APP. Confirmed via grep of
--     non-generated source. Neon snapshot taken before applying.
--  2. suppliers.taxId @unique global constraint — every supplier query is
--     tenant-scoped (`findFirst({ where: { taxId, tenantId } })`), so the
--     global uniqueness was redundant with the `(tenantId, taxId)` composite.

ALTER TABLE "users"
  DROP COLUMN IF EXISTS "created_by_id",
  DROP COLUMN IF EXISTS "updated_by_id";

ALTER TABLE "suppliers"
  DROP CONSTRAINT IF EXISTS "suppliers_tax_id_key";
