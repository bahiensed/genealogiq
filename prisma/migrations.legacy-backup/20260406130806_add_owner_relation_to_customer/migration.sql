-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'APP_USER';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "customer_id" TEXT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
