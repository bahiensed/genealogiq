-- Moves the B2C subscription prices into the same versioned price book the
-- partner plans use.
--
-- `Subscription` kept its own price_usd / monthly_price_brl / stripe_*_price_id
-- columns, which carry exactly the defect plan_prices was built to fix: editing
-- an amount is an UPDATE, so it rewrites what every past sale was charged. The
-- B2B side was fixed; leaving the consumer side on mutable columns would mean
-- two ways of pricing in one system, and only one of them honest.
--
-- Expand half of an expand/contract: the columns stay for now so running code
-- keeps working. A later migration drops them once the readers move.
--
-- Two details this deliberately preserves:
--
--   A FREE plan gets NO row. It has nothing to charge, and a price book entry
--   of zero would make it look sellable to every "is this priced" check.
--
--   The monthly amount is MATERIALISED, not left null. The old sync derived it
--   as price / term_length whenever the column was empty, so a plan priced
--   annually always offered a monthly option too. plan_prices reads a null
--   instalment as "not offered", so copying the null across would silently
--   remove monthly billing from any plan that relied on the derivation.
--
-- Naming: installment_count/installment_amount read as B2B on their face, but
-- the meaning is the same on both sides — how many billing periods make one
-- term, and what each costs. For a partner that is twelve instalments of an
-- annual contract; for a consumer it is a monthly plan against the annual one.

INSERT INTO "plan_prices" (
  "id", "subscription_id", "currency", "country_scope",
  "annual_cash_amount", "installment_count", "installment_amount",
  "effective_from", "version", "is_active",
  "stripe_product_id", "stripe_cash_price_id", "stripe_installment_price_id",
  "created_at", "updated_at"
)
SELECT
  'sprice_' || s.code || '_' || c.currency,
  s.id,
  c.currency,
  c.country_scope,
  c.price,
  NULLIF(s.term_length, 0),
  CASE
    WHEN c.monthly IS NOT NULL THEN c.monthly
    WHEN s.term_length > 0      THEN ROUND(c.price / s.term_length, 2)
    ELSE NULL
  END,
  now(), 1, true,
  s.stripe_product_id, c.annual_id, c.monthly_id,
  now(), now()
FROM "subscriptions" s
CROSS JOIN LATERAL (
  VALUES
    ('USD', NULL, s.price_usd, s.monthly_price_usd, s.stripe_annual_price_id_usd, s.stripe_monthly_price_id_usd),
    ('BRL', 'BR', s.price_brl, s.monthly_price_brl, s.stripe_annual_price_id_brl, s.stripe_monthly_price_id_brl),
    ('MXN', 'MX', s.price_mxn, s.monthly_price_mxn, s.stripe_annual_price_id_mxn, s.stripe_monthly_price_id_mxn)
) AS c(currency, country_scope, price, monthly, annual_id, monthly_id)
WHERE c.price IS NOT NULL
  AND c.price > 0;
