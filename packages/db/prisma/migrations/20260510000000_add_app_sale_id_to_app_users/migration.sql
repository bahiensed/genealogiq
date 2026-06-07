-- AlterTable
ALTER TABLE "app_users" ADD COLUMN "app_sale_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "app_users_app_sale_id_key" ON "app_users"("app_sale_id");

-- AddForeignKey
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_app_sale_id_fkey" FOREIGN KEY ("app_sale_id") REFERENCES "app_sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
