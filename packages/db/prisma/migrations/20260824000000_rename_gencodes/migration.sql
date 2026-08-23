-- Renames the licence model to the word the whole product uses: GenCode.
--
-- Nothing about the data changes. This is the database half of a rename the
-- UI, routes and code already made — `physical_qr_licenses` was the last place
-- still calling it "physical QR", a contrast that stopped meaning anything
-- when the DIGITAL product was retired.
--
-- Renames are metadata-only in Postgres: no table rewrite, no lock beyond a
-- brief ACCESS EXCLUSIVE, and the 22 existing rows are untouched.

-- Table.
ALTER TABLE "physical_qr_licenses" RENAME TO "gencodes";

-- Enum types. The `status` column's default is stored as a reference to the
-- type, so renaming the type carries the default with it automatically.
ALTER TYPE "PhysicalQrStatus"      RENAME TO "GenCodeStatus";
ALTER TYPE "PhysicalQrSaleChannel" RENAME TO "GenCodeSaleChannel";

-- Constraints and indexes do NOT follow a table rename in Postgres. Left
-- alone they keep the old prefix forever and drift from what Prisma expects,
-- so rename them explicitly.
ALTER TABLE "gencodes" RENAME CONSTRAINT "physical_qr_licenses_pkey"                      TO "gencodes_pkey";
ALTER TABLE "gencodes" RENAME CONSTRAINT "physical_qr_licenses_app_user_id_fkey"          TO "gencodes_app_user_id_fkey";
ALTER TABLE "gencodes" RENAME CONSTRAINT "physical_qr_licenses_package_id_fkey"           TO "gencodes_package_id_fkey";
ALTER TABLE "gencodes" RENAME CONSTRAINT "physical_qr_licenses_sale_id_fkey"              TO "gencodes_sale_id_fkey";
ALTER TABLE "gencodes" RENAME CONSTRAINT "physical_qr_licenses_sold_by_id_fkey"           TO "gencodes_sold_by_id_fkey";
ALTER TABLE "gencodes" RENAME CONSTRAINT "physical_qr_licenses_sold_to_app_user_id_fkey"  TO "gencodes_sold_to_app_user_id_fkey";
ALTER TABLE "gencodes" RENAME CONSTRAINT "physical_qr_licenses_tenant_id_fkey"            TO "gencodes_tenant_id_fkey";

ALTER INDEX "physical_qr_licenses_app_user_id_key"        RENAME TO "gencodes_app_user_id_key";
ALTER INDEX "physical_qr_licenses_gen_code_key"           RENAME TO "gencodes_gen_code_key";
ALTER INDEX "physical_qr_licenses_tenant_id_status_idx"   RENAME TO "gencodes_tenant_id_status_idx";
