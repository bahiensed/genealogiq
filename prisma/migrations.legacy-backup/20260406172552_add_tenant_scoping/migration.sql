/*
  Warnings:

  - A unique constraint covering the columns `[tenant_id,name]` on the table `customer_categories` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,name]` on the table `supplier_categories` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "customer_categories_name_key";

-- DropIndex
DROP INDEX "supplier_categories_name_key";

-- AlterTable
ALTER TABLE "customer_categories" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "supplier_categories" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "tenant_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "customer_categories_tenant_id_name_key" ON "customer_categories"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_categories_tenant_id_name_key" ON "supplier_categories"("tenant_id", "name");

-- AddForeignKey
ALTER TABLE "supplier_categories" ADD CONSTRAINT "supplier_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_categories" ADD CONSTRAINT "customer_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
