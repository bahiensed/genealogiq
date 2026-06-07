-- 1. Drop shortBio (just added; safe to drop)
ALTER TABLE "app_users" DROP COLUMN IF EXISTS "short_bio";

-- 2. NotificationType enum
CREATE TYPE "NotificationType" AS ENUM (
  'TRIBUTE_PENDING',
  'TRIBUTE_APPROVED',
  'TRIBUTE_REJECTED',
  'FAMILY_REQUEST_PENDING',
  'FAMILY_REQUEST_ACCEPTED',
  'FAMILY_REQUEST_REJECTED'
);

-- 3. FamilyRelation gets a status to support pending invitations
ALTER TABLE "app_family_relations"
  ADD COLUMN "status"        TEXT NOT NULL DEFAULT 'ACCEPTED',
  ADD COLUMN "requested_by"  TEXT;

-- 4. Unified notifications table
CREATE TABLE "app_notifications" (
  "id"                  TEXT PRIMARY KEY,
  "user_id"             TEXT NOT NULL REFERENCES "app_users"("id") ON DELETE CASCADE,
  "type"                "NotificationType" NOT NULL,
  "tribute_id"          TEXT REFERENCES "app_tributes"("id") ON DELETE CASCADE,
  "family_relation_id"  TEXT REFERENCES "app_family_relations"("id") ON DELETE CASCADE,
  "actor_id"            TEXT REFERENCES "app_users"("id") ON DELETE SET NULL,
  "read_at"             TIMESTAMP,
  "created_at"          TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX "app_notifications_user_unread"
  ON "app_notifications"("user_id") WHERE "read_at" IS NULL;
CREATE INDEX "app_notifications_user_created"
  ON "app_notifications"("user_id", "created_at" DESC);

-- 5. Backfill: every currently PENDING tribute becomes a TRIBUTE_PENDING
-- notification for the profile's guardian(s).
INSERT INTO "app_notifications" ("id", "user_id", "type", "tribute_id", "actor_id", "created_at")
SELECT
  gen_random_uuid()::text,
  g."guardian_id",
  'TRIBUTE_PENDING',
  t."id",
  t."app_author_id",
  t."created_at"
FROM "app_tributes" t
JOIN "app_user_guardians" g ON g."app_user_id" = t."app_profile_id"
WHERE t."status" = 'PENDING';
