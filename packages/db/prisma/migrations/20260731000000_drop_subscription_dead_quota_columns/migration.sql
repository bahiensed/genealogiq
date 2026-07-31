-- Drop unused feature-limit columns from subscriptions. apps/app/src/lib/plan-quotas.ts
-- is now the sole source of truth for these quotas (see comment at top of that file);
-- these DB columns have been dead weight since that refactor. Idempotent/safe to rerun.
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "tree_max_members";
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "bio_max_chars";
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "bio_max_images";
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "gallery_max_images";
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "gallery_max_videos";
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "geolocation_full_access";
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "qr_code_access";
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "geo_places_max";
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "documents_max";
