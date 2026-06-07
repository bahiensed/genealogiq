-- Migration: physical_qr_licenses
-- Adds PackageType enum, type column to packages, and physical_qr_licenses table.
-- Idempotent — safe to run multiple times or from multiple repos.

-- 1. Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PackageType') THEN
    CREATE TYPE "PackageType" AS ENUM ('DIGITAL', 'PHYSICAL');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PhysicalQrStatus') THEN
    CREATE TYPE "PhysicalQrStatus" AS ENUM ('AVAILABLE', 'ACTIVATED');
  END IF;
END $$;

-- 2. Add type column to packages
ALTER TABLE "packages"
  ADD COLUMN IF NOT EXISTS "type" "PackageType" NOT NULL DEFAULT 'DIGITAL';

-- 3. Create physical_qr_licenses table
CREATE TABLE IF NOT EXISTS "physical_qr_licenses" (
  "id"           TEXT               NOT NULL,
  "gen_code"     TEXT               NOT NULL,
  "status"       "PhysicalQrStatus" NOT NULL DEFAULT 'AVAILABLE',
  "sale_id"      INTEGER            NOT NULL,
  "package_id"   TEXT               NOT NULL,
  "tenant_id"    TEXT               NOT NULL,
  "app_user_id"  TEXT,
  "activated_at" TIMESTAMP(3),
  "created_at"   TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "physical_qr_licenses_pkey" PRIMARY KEY ("id")
);

-- 4. Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "physical_qr_licenses_gen_code_key"
  ON "physical_qr_licenses"("gen_code");
CREATE UNIQUE INDEX IF NOT EXISTS "physical_qr_licenses_app_user_id_key"
  ON "physical_qr_licenses"("app_user_id");
CREATE INDEX IF NOT EXISTS "physical_qr_licenses_tenant_id_status_idx"
  ON "physical_qr_licenses"("tenant_id", "status");

-- 5. Foreign keys
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'physical_qr_licenses_sale_id_fkey') THEN
    ALTER TABLE "physical_qr_licenses" ADD CONSTRAINT "physical_qr_licenses_sale_id_fkey"
      FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'physical_qr_licenses_package_id_fkey') THEN
    ALTER TABLE "physical_qr_licenses" ADD CONSTRAINT "physical_qr_licenses_package_id_fkey"
      FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'physical_qr_licenses_tenant_id_fkey') THEN
    ALTER TABLE "physical_qr_licenses" ADD CONSTRAINT "physical_qr_licenses_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'physical_qr_licenses_app_user_id_fkey') THEN
    ALTER TABLE "physical_qr_licenses" ADD CONSTRAINT "physical_qr_licenses_app_user_id_fkey"
      FOREIGN KEY ("app_user_id") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
