-- Drop FK and column: packages.license_id (no longer part of the schema)
ALTER TABLE "packages" DROP CONSTRAINT IF EXISTS "packages_license_id_fkey";
ALTER TABLE "packages" DROP COLUMN IF EXISTS "license_id";

-- Drop FK and unique/column: tenant_licenses.license_id (replaced by tenantId @unique)
ALTER TABLE "tenant_licenses" DROP CONSTRAINT IF EXISTS "tenant_licenses_license_id_fkey";
ALTER TABLE "tenant_licenses" DROP CONSTRAINT IF EXISTS "tenant_licenses_tenant_id_license_id_key";
ALTER TABLE "tenant_licenses" DROP COLUMN IF EXISTS "license_id";
