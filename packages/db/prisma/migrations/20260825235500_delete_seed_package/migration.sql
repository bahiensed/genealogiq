-- Deletes the last legacy Package row.
--
-- "Seed" (100 units, USD 299.90) was the ancestor of today's Semente plan. The
-- previous migration only deactivated it, on the theory it was worth keeping
-- visible until Package is dropped; that turned out to be worth nothing, since
-- the four partner_plans rows now carry the real catalogue.
--
-- It never reached Stripe — stripe_product_id was NULL — so there is nothing to
-- archive on that side, unlike "GenCode". Nothing references it either:
-- gencodes and sales are empty and _CouponPackages holds no rows.
--
-- After this, packages is empty and exists only to be dropped once checkout and
-- fulfilment stop importing its Prisma model.

DELETE FROM "packages" WHERE "name" = 'Seed' AND "quantity" = 100;
