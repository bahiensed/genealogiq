-- AlterTable: add unique index to tax_id on suppliers and customers
CREATE UNIQUE INDEX IF NOT EXISTS "suppliers_tax_id_key" ON "suppliers"("tax_id");
CREATE UNIQUE INDEX IF NOT EXISTS "customers_tax_id_key" ON "customers"("tax_id");
