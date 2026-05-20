-- AlterTable: add per-tenant unique index to tax_id on suppliers
CREATE UNIQUE INDEX IF NOT EXISTS "suppliers_tenant_id_tax_id_key" ON "suppliers"("tenant_id", "tax_id");
