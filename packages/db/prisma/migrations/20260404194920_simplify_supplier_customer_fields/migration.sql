/*
  Warnings:

  - You are about to drop the column `first_name` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `last_name` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `first_name` on the `suppliers` table. All the data in the column will be lost.
  - You are about to drop the column `last_name` on the `suppliers` table. All the data in the column will be lost.
  - Made the column `email` on table `customers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `name` on table `customers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `trade_name` on table `customers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tax_id` on table `customers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `phone` on table `customers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `email` on table `suppliers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `name` on table `suppliers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `trade_name` on table `suppliers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tax_id` on table `suppliers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `phone` on table `suppliers` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "customers" DROP COLUMN "first_name",
DROP COLUMN "last_name",
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "trade_name" SET NOT NULL,
ALTER COLUMN "tax_id" SET NOT NULL,
ALTER COLUMN "phone" SET NOT NULL;

-- AlterTable
ALTER TABLE "suppliers" DROP COLUMN "first_name",
DROP COLUMN "last_name",
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "trade_name" SET NOT NULL,
ALTER COLUMN "tax_id" SET NOT NULL,
ALTER COLUMN "phone" SET NOT NULL;
