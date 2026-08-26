-- Retires the two Package rows left over from the batch-of-codes model.
--
-- "GenCode" (1 unit, USD 29.99) is deleted outright. Its Stripe counterpart —
-- product prod_V8d2hssxrdmqYI and the one-time price price_1U8Lmb… — was
-- archived by hand in live mode at the same time. That price was the reason to
-- act: nothing in the app referenced it any more (20260825220000_package_cadence
-- had already nulled the id columns, so checkout refused the sale cleanly), but
-- it stayed reachable from outside — a dashboard payment link, an old email —
-- and a payment against it would have charged USD 29.99 for a product the
-- webhook can no longer fulfil. Money in, nothing out.
--
-- "Seed" (100 units) is only deactivated, not deleted: it is the ancestor of
-- today's Semente and worth keeping visible in the DB until Package is dropped
-- for good, but it must stop appearing as sellable in BMS.
--
-- Safe to delete rather than soft-delete: gencodes and sales are both empty and
-- _CouponPackages holds no rows, so nothing points at either package. Matched
-- on name + quantity rather than id so this behaves the same in any environment.

DELETE FROM "packages" WHERE "name" = 'GenCode' AND "quantity" = 1;

UPDATE "packages" SET "is_active" = false, "updated_at" = now()
WHERE "name" = 'Seed' AND "quantity" = 100;
