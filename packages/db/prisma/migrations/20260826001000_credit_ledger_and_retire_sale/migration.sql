-- The pivot: the right to activate stops being a row of stock and becomes a
-- balance in a ledger.
--
-- Package and Sale are dropped. They modelled a batch of codes a partner bought
-- outright; what a partner buys now is a yearly contract with an allowance, and
-- that lives in partner_plans / partner_subscriptions / subscription_cycles.
-- Both tables are empty, and their last rows were retired in
-- 20260825235000 and 20260825235500.
--
-- gencodes loses sale_id and package_id. This is the change that makes rollover
-- possible at all: activation used to be gated on the originating Sale's
-- window, so a code minted in cycle 1 died with cycle 1 no matter how much the
-- partner had paid since. Authorisation moves to the ledger, and the code keeps
-- only provenance — minted_in_cycle_id — plus the CONSUME that paid for it.
--
-- The ledger's three tables split one question three ways:
--   credit_grants        where a right came from and when it dies
--   credit_transactions  every movement, once, immutable
--   credit_reservations  a right held for a specific code between sale and
--                        activation
--
-- Grants exist instead of a single counter because FEFO needs an answer to
-- "which credit did this spend": rollover expires in six months and the fresh
-- allowance in twelve. remaining_qty is a materialised balance for reads; the
-- transactions are the truth, and a disagreement means the counter is wrong.
--
-- _CouponPackages goes with Package; coupons now apply to plans.

-- CreateEnum
CREATE TYPE "CreditSource" AS ENUM ('ANNUAL', 'ROLLOVER', 'FOUNDER_ROLLOVER', 'COMMITTED', 'BONUS', 'TOPUP', 'MIGRATION');

-- CreateEnum
CREATE TYPE "CreditTransactionType" AS ENUM ('GRANT', 'RESERVE', 'RELEASE', 'CONSUME', 'EXPIRE', 'ADJUST', 'REVERSE');

-- CreateEnum
CREATE TYPE "CreditGrantStatus" AS ENUM ('ACTIVE', 'EXHAUSTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CreditReservationStatus" AS ENUM ('HELD', 'CONSUMED', 'RELEASED', 'EXPIRED');

-- DropForeignKey
ALTER TABLE "_CouponPackages" DROP CONSTRAINT "_CouponPackages_A_fkey";

-- DropForeignKey
ALTER TABLE "_CouponPackages" DROP CONSTRAINT "_CouponPackages_B_fkey";

-- DropForeignKey
ALTER TABLE "gencodes" DROP CONSTRAINT "gencodes_package_id_fkey";

-- DropForeignKey
ALTER TABLE "gencodes" DROP CONSTRAINT "gencodes_sale_id_fkey";

-- DropForeignKey
ALTER TABLE "sales" DROP CONSTRAINT "sales_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "sales" DROP CONSTRAINT "sales_discount_coupon_id_fkey";

-- DropForeignKey
ALTER TABLE "sales" DROP CONSTRAINT "sales_package_id_fkey";

-- DropForeignKey
ALTER TABLE "sales" DROP CONSTRAINT "sales_paid_by_id_fkey";

-- DropForeignKey
ALTER TABLE "sales" DROP CONSTRAINT "sales_sold_by_id_fkey";

-- AlterTable
ALTER TABLE "gencodes" DROP COLUMN "package_id",
DROP COLUMN "sale_id",
ADD COLUMN     "credit_transaction_id" TEXT,
ADD COLUMN     "minted_in_cycle_id" TEXT;

-- DropTable
DROP TABLE "_CouponPackages";

-- DropTable
DROP TABLE "packages";

-- DropTable
DROP TABLE "sales";

-- CreateTable
CREATE TABLE "credit_grants" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "cycle_id" TEXT,
    "source" "CreditSource" NOT NULL,
    "granted_qty" INTEGER NOT NULL,
    "remaining_qty" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3),
    "rollover_generation" INTEGER NOT NULL DEFAULT 0,
    "status" "CreditGrantStatus" NOT NULL DEFAULT 'ACTIVE',
    "gen_code_id" TEXT,
    "buyer_id" TEXT,
    "created_by_id" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" TEXT NOT NULL,
    "grant_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" "CreditTransactionType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "gen_code_id" TEXT,
    "reservation_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_id" TEXT,
    "reason" TEXT,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_reservations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "grant_id" TEXT NOT NULL,
    "gen_code_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "CreditReservationStatus" NOT NULL DEFAULT 'HELD',
    "expires_at" TIMESTAMP(3),
    "external_reference" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CouponPlans" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CouponPlans_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "credit_grants_gen_code_id_key" ON "credit_grants"("gen_code_id");

-- CreateIndex
CREATE INDEX "credit_grants_tenant_id_status_expires_at_idx" ON "credit_grants"("tenant_id", "status", "expires_at");

-- CreateIndex
CREATE INDEX "credit_grants_cycle_id_idx" ON "credit_grants"("cycle_id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_transactions_idempotency_key_key" ON "credit_transactions"("idempotency_key");

-- CreateIndex
CREATE INDEX "credit_transactions_tenant_id_occurred_at_idx" ON "credit_transactions"("tenant_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "credit_transactions_grant_id_idx" ON "credit_transactions"("grant_id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_reservations_gen_code_id_key" ON "credit_reservations"("gen_code_id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_reservations_idempotency_key_key" ON "credit_reservations"("idempotency_key");

-- CreateIndex
CREATE INDEX "credit_reservations_tenant_id_status_idx" ON "credit_reservations"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "_CouponPlans_B_index" ON "_CouponPlans"("B");

-- CreateIndex
CREATE UNIQUE INDEX "gencodes_credit_transaction_id_key" ON "gencodes"("credit_transaction_id");

-- AddForeignKey
ALTER TABLE "gencodes" ADD CONSTRAINT "gencodes_minted_in_cycle_id_fkey" FOREIGN KEY ("minted_in_cycle_id") REFERENCES "subscription_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gencodes" ADD CONSTRAINT "gencodes_credit_transaction_id_fkey" FOREIGN KEY ("credit_transaction_id") REFERENCES "credit_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_grants" ADD CONSTRAINT "credit_grants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_grants" ADD CONSTRAINT "credit_grants_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "partner_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_grants" ADD CONSTRAINT "credit_grants_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "subscription_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_grants" ADD CONSTRAINT "credit_grants_gen_code_id_fkey" FOREIGN KEY ("gen_code_id") REFERENCES "gencodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_grants" ADD CONSTRAINT "credit_grants_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_grant_id_fkey" FOREIGN KEY ("grant_id") REFERENCES "credit_grants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_reservations" ADD CONSTRAINT "credit_reservations_grant_id_fkey" FOREIGN KEY ("grant_id") REFERENCES "credit_grants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_reservations" ADD CONSTRAINT "credit_reservations_gen_code_id_fkey" FOREIGN KEY ("gen_code_id") REFERENCES "gencodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CouponPlans" ADD CONSTRAINT "_CouponPlans_A_fkey" FOREIGN KEY ("A") REFERENCES "discount_coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CouponPlans" ADD CONSTRAINT "_CouponPlans_B_fkey" FOREIGN KEY ("B") REFERENCES "partner_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
