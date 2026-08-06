-- One-time "buy 1 extra unit" purchases (geo places / QR codes / memorial
-- slots) on top of a guardian's plan quota, independent of the recurring
-- Subscription pricing. Additive and idempotent.

CREATE TABLE IF NOT EXISTS "app_extra_unit_prices" (
  "id"                    TEXT           NOT NULL,
  "resource"              TEXT           NOT NULL,
  "tier"                  TEXT           NOT NULL,
  "price_usd"             DECIMAL(10, 2),
  "price_brl"             DECIMAL(10, 2),
  "price_mxn"             DECIMAL(10, 2),
  "stripe_product_id"     TEXT,
  "stripe_price_id_usd"   TEXT,
  "stripe_price_id_brl"   TEXT,
  "stripe_price_id_mxn"   TEXT,
  CONSTRAINT "app_extra_unit_prices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "app_extra_unit_prices_resource_tier_key"
  ON "app_extra_unit_prices" ("resource", "tier");
CREATE UNIQUE INDEX IF NOT EXISTS "app_extra_unit_prices_stripe_product_id_key"
  ON "app_extra_unit_prices" ("stripe_product_id");
CREATE UNIQUE INDEX IF NOT EXISTS "app_extra_unit_prices_stripe_price_id_usd_key"
  ON "app_extra_unit_prices" ("stripe_price_id_usd");
CREATE UNIQUE INDEX IF NOT EXISTS "app_extra_unit_prices_stripe_price_id_brl_key"
  ON "app_extra_unit_prices" ("stripe_price_id_brl");
CREATE UNIQUE INDEX IF NOT EXISTS "app_extra_unit_prices_stripe_price_id_mxn_key"
  ON "app_extra_unit_prices" ("stripe_price_id_mxn");

CREATE TABLE IF NOT EXISTS "app_extra_unit_purchases" (
  "id"                TEXT           NOT NULL,
  "buyer_id"          VARCHAR        NOT NULL,
  "resource"          TEXT           NOT NULL,
  "quantity"          INTEGER        NOT NULL DEFAULT 1,
  "tier"              TEXT           NOT NULL,
  "currency"          TEXT           NOT NULL,
  "amount_paid"       DECIMAL(10, 2) NOT NULL,
  "stripe_session_id" TEXT,
  "created_at"        TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "app_extra_unit_purchases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "app_extra_unit_purchases_stripe_session_id_key"
  ON "app_extra_unit_purchases" ("stripe_session_id");
CREATE INDEX IF NOT EXISTS "app_extra_unit_purchases_buyer_id_resource_idx"
  ON "app_extra_unit_purchases" ("buyer_id", "resource");

DO $$ BEGIN
  ALTER TABLE "app_extra_unit_purchases"
    ADD CONSTRAINT "app_extra_unit_purchases_buyer_id_fkey"
    FOREIGN KEY ("buyer_id") REFERENCES "app_users"("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Real per-resource, per-tier prices, decided by the product owner. No row
-- for MEMORIAL+FREE — its absence is the "not purchasable, must upgrade"
-- signal (matches the blank cell in the price sheet).
INSERT INTO "app_extra_unit_prices" ("id", "resource", "tier", "price_usd", "price_brl", "price_mxn")
VALUES
  ('cm_extra_geo_free',     'GEO_PLACE', 'FREE',    2.99,  14.95,  54.99),
  ('cm_extra_geo_premium',  'GEO_PLACE', 'PREMIUM', 0.99,  4.99,   19.99),
  ('cm_extra_qr_free',      'QR_CODE',   'FREE',    29.99, 149.95, 539.90),
  ('cm_extra_qr_premium',   'QR_CODE',   'PREMIUM', 19.99, 99.95,  359.90),
  ('cm_extra_memo_premium', 'MEMORIAL',  'PREMIUM', 1.99,  9.99,   34.99)
ON CONFLICT ("resource", "tier") DO NOTHING;
