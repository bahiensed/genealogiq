-- Gives Sale a payment lifecycle, so a sale can exist before the money does.
--
-- Until now a Sale was only ever written after payment: SEQ's webhook created
-- the row and minted the GenCodes in one transaction, and BMS's manual path
-- wrote it immediately on an operator's word. Nothing distinguished "paid" from
-- "awaiting payment" because the unpaid state had nowhere to live. The BMS
-- payment-link flow needs exactly that state.
--
-- Lifecycle, read in this order:
--   reversed_at -> reversed | paid_at -> active | expired_at -> link expired
--   otherwise   -> awaiting payment
--
-- The amount columns are a snapshot, not a derivation. Revenue is currently
-- recomputed as quantity x packages.price at read time — /sales/reports even
-- carries a caveat saying so. A discount coupon turns that from imprecise into
-- wrong, because the discount would exist nowhere in this database. Stripe
-- reports these in cents, so that is how they are stored.
--
-- paid_by_id is only set when an operator records an off-Stripe payment
-- (transfer, PIX). A sale Stripe settled leaves it null, which is what
-- distinguishes the two.

ALTER TABLE "sales"
  ADD COLUMN "paid_at"            TIMESTAMP(3),
  ADD COLUMN "paid_by_id"         TEXT,
  ADD COLUMN "expired_at"         TIMESTAMP(3),
  ADD COLUMN "checkout_url"       TEXT,
  ADD COLUMN "amount_subtotal"    INTEGER,
  ADD COLUMN "amount_total"       INTEGER,
  ADD COLUMN "currency"           TEXT,
  ADD COLUMN "discount_coupon_id" TEXT;

ALTER TABLE "sales"
  ADD CONSTRAINT "sales_paid_by_id_fkey"
  FOREIGN KEY ("paid_by_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sales"
  ADD CONSTRAINT "sales_discount_coupon_id_fkey"
  FOREIGN KEY ("discount_coupon_id") REFERENCES "discount_coupons"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "sales_paid_by_id_idx"         ON "sales"("paid_by_id");
CREATE INDEX "sales_discount_coupon_id_idx" ON "sales"("discount_coupon_id");

-- Every row that predates this column was written only after payment, by
-- definition of the two paths above — so an existing sale is a paid sale.
-- Without this they would all render red as "awaiting payment".
--
-- The BMS sales table happens to be empty right now (the fake test rows were
-- purged just before this migration), but this must still be correct: the
-- development branch has its own rows, and any sale created between the purge
-- and this deploy would be stranded.
UPDATE "sales" SET "paid_at" = "created_at" WHERE "paid_at" IS NULL;
