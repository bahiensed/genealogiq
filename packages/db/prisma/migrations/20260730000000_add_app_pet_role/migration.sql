-- Add APP_PET to the AppRole enum.
-- APP_PET records are pet profiles — guardian-managed like APP_MEMO
-- memorials, reusing the same AppUser polymorphism (bio/gallery/documents/
-- places, guardian model, quota resolution). Attached to owner(s) in the
-- family tree via a FamilyRelation row of type "PET_OF" (no schema change
-- needed there — FamilyRelation.type is a free-text column).
ALTER TYPE "AppRole" ADD VALUE IF NOT EXISTS 'APP_PET';

-- Species/breed — only meaningful for role=APP_PET, left NULL for every
-- other role, same pattern as the existing death*/auth-only columns.
ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "pet_species" TEXT;
ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "pet_breed" TEXT;
