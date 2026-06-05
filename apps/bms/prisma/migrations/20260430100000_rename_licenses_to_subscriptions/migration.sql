DO $$
BEGIN

  -- Remove orphaned app_sales rows where license_id has no matching license
  DELETE FROM "app_sales"
  WHERE "license_id" IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM "licenses" WHERE "id" = "app_sales"."license_id");

  -- ── licenses → subscriptions ───────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='licenses') THEN
    ALTER TABLE "licenses" RENAME TO "subscriptions";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='licenses_pkey') THEN
    ALTER INDEX "licenses_pkey" RENAME TO "subscriptions_pkey";
  END IF;

  -- ── app_sales.license_id → subscription_id ─────────────────────────────────
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema='public' AND constraint_name='app_sales_license_id_fkey'
  ) THEN
    ALTER TABLE "app_sales" DROP CONSTRAINT "app_sales_license_id_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='app_sales' AND column_name='license_id'
  ) THEN
    ALTER TABLE "app_sales" RENAME COLUMN "license_id" TO "subscription_id";
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema='public' AND constraint_name='app_sales_subscription_id_fkey'
  ) THEN
    ALTER TABLE "app_sales" ADD CONSTRAINT "app_sales_subscription_id_fkey"
      FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  -- ── tenant_licenses → qr_inventory ─────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='tenant_licenses') THEN
    ALTER TABLE "tenant_licenses" RENAME TO "qr_inventory";
  END IF;

  -- Rename PK (actual name: customer_licenses_pkey)
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='customer_licenses_pkey') THEN
    ALTER INDEX "customer_licenses_pkey" RENAME TO "qr_inventory_pkey";
  END IF;

  -- Rename unique index on tenant_id
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='tenant_licenses_tenant_id_key') THEN
    ALTER INDEX "tenant_licenses_tenant_id_key" RENAME TO "qr_inventory_tenant_id_key";
  END IF;

  -- Rename FK to tenants (actual name: customer_licenses_customer_id_fkey)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema='public' AND constraint_name='customer_licenses_customer_id_fkey'
  ) THEN
    ALTER TABLE "qr_inventory" RENAME CONSTRAINT "customer_licenses_customer_id_fkey" TO "qr_inventory_tenant_id_fkey";
  END IF;

END $$;
