-- Drops AppUser.app_sale_id, the last trace of the bulk-slot model.
--
-- It bound a memorial to the specific AppSale that paid for it, back when one
-- sale covered N memorials. The channel that created those sales went with the
-- DIGITAL product, and `maxProfiles` — the code that actually did the binding —
-- went in 20260824030000. Since then nothing writes this column.
--
-- Confirmed before writing: 0 of 115 app_users have app_sale_id set, and
-- app_sales is empty. Removing it cannot strand anyone.
--
-- Two branches went with it: the "sale assigned directly to this profile" step
-- in getMemorialFeatures, and half of qr-quota's hasOwnUnlock. A redeemed
-- GenCode is now the only thing that unlocks a QR outside the rank heuristic.

ALTER TABLE "app_users" DROP COLUMN IF EXISTS "app_sale_id";
