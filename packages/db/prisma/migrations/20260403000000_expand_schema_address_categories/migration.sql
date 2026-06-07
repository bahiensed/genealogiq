-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- CreateTable (addresses)
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "zip" TEXT,
    "street" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable (supplier_categories)
CREATE TABLE "supplier_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable (customer_categories)
CREATE TABLE "customer_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_categories_pkey" PRIMARY KEY ("id")
);

-- AlterTable (companies) — add as nullable first to handle existing rows, then set NOT NULL
ALTER TABLE "companies"
    ADD COLUMN "tax_id" TEXT,
    ADD COLUMN "email" TEXT,
    ADD COLUMN "phone" TEXT,
    ADD COLUMN "phone_country_code" TEXT NOT NULL DEFAULT '55',
    ADD COLUMN "state_registration" TEXT,
    ADD COLUMN "municipal_registration" TEXT,
    ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "address_id" TEXT;

-- Backfill placeholder values for existing rows
UPDATE "companies" SET
    "tax_id" = 'PENDING',
    "email" = 'pending@setup.local',
    "phone" = '00000000000'
WHERE "tax_id" IS NULL;

-- Set NOT NULL after backfill
ALTER TABLE "companies"
    ALTER COLUMN "tax_id" SET NOT NULL,
    ALTER COLUMN "email" SET NOT NULL,
    ALTER COLUMN "phone" SET NOT NULL;

-- AlterTable (users)
ALTER TABLE "users"
    ADD COLUMN "national_id" TEXT,
    ADD COLUMN "birth_date" TIMESTAMP(3),
    ADD COLUMN "phone_country_code" TEXT NOT NULL DEFAULT '55',
    ADD COLUMN "phone" TEXT,
    ADD COLUMN "address_id" TEXT;

-- AlterTable (suppliers) — drop person columns, add business entity columns
ALTER TABLE "suppliers"
    DROP COLUMN "first_name",
    DROP COLUMN "last_name",
    ADD COLUMN "entity_type" "EntityType",
    ADD COLUMN "name" TEXT,
    ADD COLUMN "trade_name" TEXT,
    ADD COLUMN "tax_id" TEXT,
    ADD COLUMN "state_registration" TEXT,
    ADD COLUMN "municipal_registration" TEXT,
    ADD COLUMN "phone_country_code" TEXT NOT NULL DEFAULT '55',
    ADD COLUMN "phone" TEXT,
    ADD COLUMN "notes" TEXT,
    ADD COLUMN "category_id" TEXT,
    ADD COLUMN "address_id" TEXT;

-- Backfill suppliers
UPDATE "suppliers" SET
    "entity_type" = 'COMPANY',
    "name" = 'PENDING',
    "tax_id" = 'PENDING',
    "phone" = '00000000000'
WHERE "entity_type" IS NULL;

-- Set NOT NULL for suppliers
ALTER TABLE "suppliers"
    ALTER COLUMN "entity_type" SET NOT NULL,
    ALTER COLUMN "name" SET NOT NULL,
    ALTER COLUMN "tax_id" SET NOT NULL,
    ALTER COLUMN "phone" SET NOT NULL;

-- AlterTable (customers) — same as suppliers
ALTER TABLE "customers"
    DROP COLUMN "first_name",
    DROP COLUMN "last_name",
    ADD COLUMN "entity_type" "EntityType",
    ADD COLUMN "name" TEXT,
    ADD COLUMN "trade_name" TEXT,
    ADD COLUMN "tax_id" TEXT,
    ADD COLUMN "state_registration" TEXT,
    ADD COLUMN "municipal_registration" TEXT,
    ADD COLUMN "phone_country_code" TEXT NOT NULL DEFAULT '55',
    ADD COLUMN "phone" TEXT,
    ADD COLUMN "notes" TEXT,
    ADD COLUMN "category_id" TEXT,
    ADD COLUMN "address_id" TEXT;

-- Backfill customers
UPDATE "customers" SET
    "entity_type" = 'COMPANY',
    "name" = 'PENDING',
    "tax_id" = 'PENDING',
    "phone" = '00000000000'
WHERE "entity_type" IS NULL;

-- Set NOT NULL for customers
ALTER TABLE "customers"
    ALTER COLUMN "entity_type" SET NOT NULL,
    ALTER COLUMN "name" SET NOT NULL,
    ALTER COLUMN "tax_id" SET NOT NULL,
    ALTER COLUMN "phone" SET NOT NULL;

-- Unique indexes
CREATE UNIQUE INDEX "supplier_categories_name_key" ON "supplier_categories"("name");
CREATE UNIQUE INDEX "customer_categories_name_key" ON "customer_categories"("name");
CREATE UNIQUE INDEX "companies_tax_id_key" ON "companies"("tax_id");
CREATE UNIQUE INDEX "companies_email_key" ON "companies"("email");
CREATE UNIQUE INDEX "companies_address_id_key" ON "companies"("address_id");
CREATE UNIQUE INDEX "customers_address_id_key" ON "customers"("address_id");
CREATE UNIQUE INDEX "suppliers_address_id_key" ON "suppliers"("address_id");
CREATE UNIQUE INDEX "users_address_id_key" ON "users"("address_id");

-- Foreign keys
ALTER TABLE "companies"  ADD CONSTRAINT "companies_address_id_fkey"   FOREIGN KEY ("address_id")  REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "users"      ADD CONSTRAINT "users_address_id_fkey"        FOREIGN KEY ("address_id")  REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "suppliers"  ADD CONSTRAINT "suppliers_category_id_fkey"   FOREIGN KEY ("category_id") REFERENCES "supplier_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "suppliers"  ADD CONSTRAINT "suppliers_address_id_fkey"    FOREIGN KEY ("address_id")  REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customers"  ADD CONSTRAINT "customers_category_id_fkey"   FOREIGN KEY ("category_id") REFERENCES "customer_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customers"  ADD CONSTRAINT "customers_address_id_fkey"    FOREIGN KEY ("address_id")  REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
