-- Drops the eight Tenant module flags that no longer gate anything.
--
-- SEQ's products / services / purchasing / inventory / finance screens were
-- removed: they rendered a heading over nothing, and there is no Product or
-- Service model in the schema to build them on. Two of them
-- (module_purchasing_products, module_purchasing_services) were worse than
-- inert — turning them on gave the tenant a menu entry that 404'd.
--
-- The two suppliers flags stay: both gate real, working CRUD.

ALTER TABLE "tenants"
  DROP COLUMN IF EXISTS "module_records_products",
  DROP COLUMN IF EXISTS "module_records_services",
  DROP COLUMN IF EXISTS "module_categories_products",
  DROP COLUMN IF EXISTS "module_categories_services",
  DROP COLUMN IF EXISTS "module_purchasing_products",
  DROP COLUMN IF EXISTS "module_purchasing_services",
  DROP COLUMN IF EXISTS "module_inventory_products",
  DROP COLUMN IF EXISTS "module_finance";
