-- Suppliers: make name/taxId/email/phone nullable, drop email unique, add PF fields
ALTER TABLE "suppliers"
  ALTER COLUMN "name"   DROP NOT NULL,
  ALTER COLUMN "tax_id" DROP NOT NULL,
  ALTER COLUMN "email"  DROP NOT NULL,
  ALTER COLUMN "phone"  DROP NOT NULL;

DROP INDEX IF EXISTS "suppliers_email_key";

ALTER TABLE "suppliers"
  ADD COLUMN IF NOT EXISTS "first_name" TEXT,
  ADD COLUMN IF NOT EXISTS "last_name"  TEXT,
  ADD COLUMN IF NOT EXISTS "birth_date" TIMESTAMP(3);

-- Customers: make name/taxId/email/phone nullable, drop email unique, add PF fields
ALTER TABLE "customers"
  ALTER COLUMN "name"   DROP NOT NULL,
  ALTER COLUMN "tax_id" DROP NOT NULL,
  ALTER COLUMN "email"  DROP NOT NULL,
  ALTER COLUMN "phone"  DROP NOT NULL;

DROP INDEX IF EXISTS "customers_email_key";

ALTER TABLE "customers"
  ADD COLUMN IF NOT EXISTS "first_name" TEXT,
  ADD COLUMN IF NOT EXISTS "last_name"  TEXT,
  ADD COLUMN IF NOT EXISTS "birth_date" TIMESTAMP(3);
