-- Splits DiscountCoupon.discount_value into the two things it was conflating.
--
-- A percentage has no currency: 10% off is 10% off in reais, dollars and pesos
-- alike. A fixed amount is money, and money needs a slot per currency exactly
-- like Package and ExtraUnitPrice already have. One column serving both meant
-- a fixed-amount coupon was silently dollars-only — createDiscountCoupon wrote
-- `currency: 'usd'` hardcoded — so it would have been rejected at a checkout
-- billing in reais.
--
-- discountType stays the discriminator: exactly one of percent_off and the
-- amount_off_* trio is populated.
--
-- Production holds a single coupon, FFB2026, 10% — a percentage, so the rename
-- puts it exactly where it belongs and the UPDATE below moves nothing. The
-- UPDATE is written for correctness anyway: the development branch has its own
-- rows, and a fixed-amount coupon created between this deploy and the last
-- would otherwise land in the percentage column.

ALTER TABLE "discount_coupons" RENAME COLUMN "discount_value" TO "percent_off";
ALTER TABLE "discount_coupons" ALTER COLUMN "percent_off" DROP NOT NULL;

ALTER TABLE "discount_coupons"
  ADD COLUMN "amount_off_usd" DECIMAL(10,2),
  ADD COLUMN "amount_off_brl" DECIMAL(10,2),
  ADD COLUMN "amount_off_mxn" DECIMAL(10,2);

-- Fixed-amount coupons were dollars by construction, so that is where they go.
UPDATE "discount_coupons"
   SET "amount_off_usd" = "percent_off",
       "percent_off"    = NULL
 WHERE "discount_type" = 'amount';
