-- 1. New AppUser fields for genealogy-flavored identity
ALTER TABLE "app_users"
  ADD COLUMN "maiden_name" TEXT,
  ADD COLUMN "nickname"    TEXT,
  ADD COLUMN "short_bio"   TEXT;

-- 2. New FamilyRelation fields for vital dates on a relation
ALTER TABLE "app_family_relations"
  ADD COLUMN "start_date" TIMESTAMP,
  ADD COLUMN "end_date"   TIMESTAMP;

-- 3. Wipe existing tree data (confirmed — no production data beyond test rows)
DELETE FROM "app_family_relations";

-- 4. Drop all APP_GHOSTs and their guardian rows
DELETE FROM "app_user_guardians"
  WHERE "app_user_id" IN (SELECT "id" FROM "app_users" WHERE "role" = 'APP_GHOST');
DELETE FROM "app_users" WHERE "role" = 'APP_GHOST';
