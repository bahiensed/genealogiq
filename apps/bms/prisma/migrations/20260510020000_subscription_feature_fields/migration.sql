-- 1. Add feature columns + code slug to subscriptions (nullable so we can backfill)
ALTER TABLE "subscriptions"
  ADD COLUMN "code"                    TEXT,
  ADD COLUMN "tree_max_members"        INT,
  ADD COLUMN "bio_max_chars"           INT,
  ADD COLUMN "bio_max_images"          INT,
  ADD COLUMN "gallery_max_images"      INT,
  ADD COLUMN "gallery_max_videos"      INT,
  ADD COLUMN "geolocation_full_access" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "qr_code_access"          BOOLEAN NOT NULL DEFAULT false;

-- 2. Backfill existing subscriptions with FREE-tier defaults + a temporary code
UPDATE "subscriptions" SET
  "code"                = COALESCE("code", 'plan-' || "id"),
  "tree_max_members"    = COALESCE("tree_max_members", 5),
  "bio_max_chars"       = COALESCE("bio_max_chars", 2000),
  "bio_max_images"      = COALESCE("bio_max_images", 3),
  "gallery_max_images"  = COALESCE("gallery_max_images", 10),
  "gallery_max_videos"  = COALESCE("gallery_max_videos", 2);

-- 3. Tighten constraints now that every row has a value
ALTER TABLE "subscriptions"
  ALTER COLUMN "code"               SET NOT NULL,
  ALTER COLUMN "tree_max_members"   SET NOT NULL,
  ALTER COLUMN "bio_max_chars"      SET NOT NULL,
  ALTER COLUMN "bio_max_images"     SET NOT NULL,
  ALTER COLUMN "gallery_max_images" SET NOT NULL,
  ALTER COLUMN "gallery_max_videos" SET NOT NULL;
CREATE UNIQUE INDEX "subscriptions_code_key" ON "subscriptions"("code");

-- 4. Relax Bio.text from VarChar(2048) to TEXT (unlimited at the DB; per-tier
--    enforcement lives in the app layer)
ALTER TABLE "app_bios" ALTER COLUMN "text" TYPE TEXT;

-- 5. Drop unique on AppUser.appSaleId so one sale can fan out to many memorials
--    (up to subscription.maxProfiles)
DROP INDEX IF EXISTS "app_users_app_sale_id_key";

-- 6. Seed the FREE row so APP can resolve features for accounts without a paid sale
INSERT INTO "subscriptions" (
  "id", "code", "name", "description", "max_profiles", "term_length", "price",
  "tree_max_members", "bio_max_chars", "bio_max_images",
  "gallery_max_images", "gallery_max_videos",
  "geolocation_full_access", "qr_code_access",
  "is_active", "created_at", "updated_at"
) VALUES (
  'clxfree000000000000000000', 'FREE', 'Free',
  'Free tier — every new account starts here',
  1, 0, 0,
  5, 2000, 3,
  10, 2,
  false, false,
  true, NOW(), NOW()
)
ON CONFLICT ("code") DO NOTHING;
