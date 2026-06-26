-- AppSale.tenant: ON DELETE CASCADE -> SET NULL. Deleting a Tenant (funeral home)
-- now nulls the tenant_id on its AppSale rows instead of destroying them, so the
-- revenue/subscription ledger survives tenant removal (tenant_id is already
-- nullable; per-tenant dashboards simply drop the null-tenant rows). Defense in
-- depth alongside the application guard in BMS deleteCustomer.
-- Idempotent: drop-if-exists then recreate with the new referential action.
ALTER TABLE "app_sales" DROP CONSTRAINT IF EXISTS "app_sales_tenant_id_fkey";
ALTER TABLE "app_sales" ADD CONSTRAINT "app_sales_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
