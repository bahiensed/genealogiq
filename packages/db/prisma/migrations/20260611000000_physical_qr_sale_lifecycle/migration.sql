-- Physical QR sale lifecycle: a code is now AVAILABLE → SOLD ("baixa") → ACTIVATED,
-- plus an orthogonal "printed" flag and sale/write-off metadata.
-- Idempotent so it can be re-applied safely.

-- New status value. Added on its own (not used in data writes here), so it is safe
-- inside the migration transaction (Postgres only forbids USING a new enum value in
-- the same transaction that adds it).
ALTER TYPE "PhysicalQrStatus" ADD VALUE IF NOT EXISTS 'SOLD';

-- Sale channel for the write-off.
DO $$ BEGIN
  CREATE TYPE "PhysicalQrSaleChannel" AS ENUM ('PLATFORM', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- New columns.
ALTER TABLE "physical_qr_licenses"
  ADD COLUMN IF NOT EXISTS "printed_at"          TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "sold_at"             TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "sold_via"            "PhysicalQrSaleChannel",
  ADD COLUMN IF NOT EXISTS "sold_by_id"          TEXT,
  ADD COLUMN IF NOT EXISTS "sold_to_app_user_id" TEXT,
  ADD COLUMN IF NOT EXISTS "sold_to_name"        TEXT,
  ADD COLUMN IF NOT EXISTS "sold_value"          DECIMAL(10,2);

-- Foreign keys (optional → ON DELETE SET NULL, matching the existing app_user_id FK).
DO $$ BEGIN
  ALTER TABLE "physical_qr_licenses"
    ADD CONSTRAINT "physical_qr_licenses_sold_by_id_fkey"
    FOREIGN KEY ("sold_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "physical_qr_licenses"
    ADD CONSTRAINT "physical_qr_licenses_sold_to_app_user_id_fkey"
    FOREIGN KEY ("sold_to_app_user_id") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
