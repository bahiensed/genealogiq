-- Drops TenantCategory and Tenant.category_id.
--
-- A BMS customer is a Tenant, and a Tenant already carries the only
-- classification the business has: entity_type (INDIVIDUAL | COMPANY). The
-- category was a free-text second axis on top of it, and in practice it never
-- became one — production holds exactly two categories, "Corporativo" and
-- "Pessoa Física", one tenant on each, i.e. a hand-maintained copy of
-- entity_type that could drift from it and had to be filled in on every form.
--
-- Surveyed before writing: 2 rows in tenant_categories, 2 of 2 tenants
-- categorised, and the two categories map 1:1 onto the two entity_type values
-- already stored on those same rows. Nothing is lost that entity_type does not
-- already say.
--
-- SEQ is untouched: its "customer categories" are AppUserCategory, a different
-- table for a different entity (the funeral home's own consumers).
--
-- Column first, then the table: tenants.category_id holds the only inbound FK.
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "category_id";

DROP TABLE IF EXISTS "tenant_categories";
