-- Drops Subscription.max_profiles, the last piece of the bulk-slot model.
--
-- It capped how many memorials ONE sale could absorb, from when SEQ/BMS sold
-- packages covering N memorials. That channel was retired with the DIGITAL
-- product, and app_sales is empty, so nothing has bound a memorial to a sale
-- since.
--
-- It was not inert, though: createMemorial still attached each new memorial to
-- the first sale with a free slot, and qr-quota grants a rank bypass to any
-- profile holding its own sale. With max_profiles = 1 on PREMIUM that quietly
-- handed subscribers a second free QR code — an accident of the old model, not
-- a decision. memorials_max is now the only memorial cap, and qr_code_max the
-- only QR allowance, both editable in BMS.

ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "max_profiles";
