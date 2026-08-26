-- Introduces the franchise model's backbone: versioned partner plans, a
-- versioned price book, the standing contract, and the cycle that renewal
-- replaces.
--
-- Nothing is dropped here. Package and Sale stay exactly as they are and keep
-- serving today's checkout; these tables sit alongside them until fulfilment
-- and the webhook point here instead. A cutover that removes the old path in
-- the same migration that adds the new one has no way back.
--
-- Two decisions worth reading before changing anything:
--
--   plan_prices serves BOTH sides of the business — a partner plan (B2B) or a
--   subscription (B2C) — through two nullable FKs, exactly one of which is set.
--   The CHECK at the bottom is what makes "exactly one" true; without it the
--   pair silently degenerates into a polymorphic reference with no integrity.
--
--   subscription_cycles freezes plan_snapshot and price_snapshot as JSON. A
--   cycle has to keep answering "what did this partner agree to" long after the
--   plan's terms and the price book have moved on. They are read as a unit and
--   never queried field-by-field, so JSON costs nothing and survives later
--   columns being added to partner_plans.
--
-- Scope note: `prisma migrate diff` against production also reports drift that
-- predates this work — app_extra_unit_purchases.buyer_id's type, two dropped
-- updated_at defaults, and a pkey rename on app_tree_node_positions. That drift
-- is deliberately NOT included. It belongs to whoever reconciles it, with its
-- own migration and its own reasoning; folding it in here would alter live
-- tables as a side effect of adding new ones.

-- CreateEnum
CREATE TYPE "PartnerSubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAST_DUE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubscriptionCycleStatus" AS ENUM ('ACTIVE', 'CLOSED', 'EXPIRED');

-- CreateTable
CREATE TABLE "partner_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "annual_allowance" INTEGER NOT NULL,
    "rollover_rate" DECIMAL(4,3) NOT NULL DEFAULT 0.30,
    "rollover_validity_months" INTEGER NOT NULL DEFAULT 6,
    "grace_days" INTEGER NOT NULL DEFAULT 30,
    "committed_reservation_months" INTEGER NOT NULL DEFAULT 12,
    "activation_trial_months" INTEGER NOT NULL DEFAULT 12,
    "activation_trial_plan_code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_prices" (
    "id" TEXT NOT NULL,
    "partner_plan_id" TEXT,
    "subscription_id" TEXT,
    "currency" VARCHAR(3) NOT NULL,
    "country_scope" VARCHAR(2),
    "annual_cash_amount" DECIMAL(10,2) NOT NULL,
    "installment_count" INTEGER,
    "installment_amount" DECIMAL(10,2),
    "unit_reference_amount" DECIMAL(10,2),
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "stripe_product_id" TEXT,
    "stripe_cash_price_id" TEXT,
    "stripe_installment_price_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_subscriptions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" "PartnerSubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "founder_rollover_eligible" BOOLEAN NOT NULL DEFAULT false,
    "founder_rollover_used" BOOLEAN NOT NULL DEFAULT false,
    "current_cycle_id" TEXT,
    "stripe_subscription_id" TEXT,
    "stripe_customer_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_cycles" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "plan_snapshot" JSONB NOT NULL,
    "price_snapshot" JSONB NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "grace_end_at" TIMESTAMP(3) NOT NULL,
    "status" "SubscriptionCycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "renewed_from_cycle_id" TEXT,
    "stripe_invoice_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partner_plans_code_key" ON "partner_plans"("code");

-- CreateIndex
CREATE UNIQUE INDEX "plan_prices_stripe_cash_price_id_key" ON "plan_prices"("stripe_cash_price_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_prices_stripe_installment_price_id_key" ON "plan_prices"("stripe_installment_price_id");

-- CreateIndex
CREATE INDEX "plan_prices_partner_plan_id_currency_effective_from_idx" ON "plan_prices"("partner_plan_id", "currency", "effective_from");

-- CreateIndex
CREATE INDEX "plan_prices_subscription_id_currency_effective_from_idx" ON "plan_prices"("subscription_id", "currency", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "partner_subscriptions_current_cycle_id_key" ON "partner_subscriptions"("current_cycle_id");

-- CreateIndex
CREATE UNIQUE INDEX "partner_subscriptions_stripe_subscription_id_key" ON "partner_subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "partner_subscriptions_tenant_id_idx" ON "partner_subscriptions"("tenant_id");

-- CreateIndex
CREATE INDEX "partner_subscriptions_status_idx" ON "partner_subscriptions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_cycles_renewed_from_cycle_id_key" ON "subscription_cycles"("renewed_from_cycle_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_cycles_stripe_invoice_id_key" ON "subscription_cycles"("stripe_invoice_id");

-- CreateIndex
CREATE INDEX "subscription_cycles_subscription_id_start_at_idx" ON "subscription_cycles"("subscription_id", "start_at" DESC);

-- CreateIndex
CREATE INDEX "subscription_cycles_end_at_idx" ON "subscription_cycles"("end_at");

-- AddForeignKey
ALTER TABLE "plan_prices" ADD CONSTRAINT "plan_prices_partner_plan_id_fkey" FOREIGN KEY ("partner_plan_id") REFERENCES "partner_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_prices" ADD CONSTRAINT "plan_prices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_subscriptions" ADD CONSTRAINT "partner_subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_subscriptions" ADD CONSTRAINT "partner_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "partner_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_subscriptions" ADD CONSTRAINT "partner_subscriptions_current_cycle_id_fkey" FOREIGN KEY ("current_cycle_id") REFERENCES "subscription_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_cycles" ADD CONSTRAINT "subscription_cycles_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "partner_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_cycles" ADD CONSTRAINT "subscription_cycles_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "partner_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_cycles" ADD CONSTRAINT "subscription_cycles_renewed_from_cycle_id_fkey" FOREIGN KEY ("renewed_from_cycle_id") REFERENCES "subscription_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- plan_prices belongs to exactly one product. Prisma cannot express this, so it
-- lives here: two nullable FKs with no rule is just a polymorphic reference
-- wearing a disguise.
ALTER TABLE "plan_prices" ADD CONSTRAINT "plan_prices_exactly_one_owner"
  CHECK (("partner_plan_id" IS NOT NULL) <> ("subscription_id" IS NOT NULL));
