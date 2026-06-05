-- AlterTable
ALTER TABLE "customers" ADD COLUMN "module_finance" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "customers" ADD COLUMN "module_inventory" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "customers" ADD COLUMN "module_purchasing" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "customers" ADD COLUMN "module_records" BOOLEAN NOT NULL DEFAULT false;
