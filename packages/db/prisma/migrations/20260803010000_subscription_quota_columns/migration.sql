-- Moves the APP's per-plan quota numbers (previously hardcoded in
-- apps/app/src/lib/plan-quotas.ts) into real Subscription columns, so BMS
-- can edit every plan attribute manually without a code deploy.
--
-- This partially reverses 20260731000000_drop_subscription_dead_quota_columns,
-- but it is NOT a 1:1 round-trip: the dropped columns were bio_max_images/
-- gallery_max_images/gallery_max_videos (separate pools) + qr_code_access
-- (boolean) — none of which map directly onto today's combined
-- media_max_images/media_max_videos (int pool) or qr_code_max (int count).
-- memorials_max and pets_max are entirely new columns that never existed in
-- the DB before (they were invented in plan-quotas.ts after the drop).
ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "tree_max_members" INTEGER NOT NULL DEFAULT 32,
  ADD COLUMN IF NOT EXISTS "bio_max_chars" INTEGER NOT NULL DEFAULT 2048,
  ADD COLUMN IF NOT EXISTS "media_max_images" INTEGER NOT NULL DEFAULT 32,
  ADD COLUMN IF NOT EXISTS "media_max_videos" INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS "documents_max" INTEGER NOT NULL DEFAULT 16,
  ADD COLUMN IF NOT EXISTS "geo_places_max" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "memorials_max" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "pets_max" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "qr_code_max" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "geolocation_full_access" BOOLEAN NOT NULL DEFAULT false;

-- FREE already matches the defaults above. Backfill PREMIUM's real numbers:
UPDATE "subscriptions" SET
  "tree_max_members" = 512,
  "bio_max_chars" = 8192,
  "media_max_images" = 1024,
  "media_max_videos" = 32,
  "documents_max" = 64,
  "geo_places_max" = 6,
  "memorials_max" = 5,
  "pets_max" = 5,
  "qr_code_max" = 1,
  "geolocation_full_access" = true
WHERE "code" = 'PREMIUM';
