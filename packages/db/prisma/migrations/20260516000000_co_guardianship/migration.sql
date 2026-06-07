-- 1. GuardianStatus enum for AppUserGuardian.
CREATE TYPE "GuardianStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- 2. AppUserGuardian gets status + requestedBy. Existing rows were created by
--    their guardian directly (no consent workflow back then), so they default
--    to ACCEPTED.
ALTER TABLE "app_user_guardians"
  ADD COLUMN "status"          "GuardianStatus" NOT NULL DEFAULT 'ACCEPTED',
  ADD COLUMN "requested_by_id" TEXT REFERENCES "app_users"("id") ON DELETE SET NULL;

-- 3. Extend NotificationType with the three guardian states. Postgres requires
--    each ADD VALUE to commit on its own, so they run as separate statements.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'GUARDIAN_REQUEST_PENDING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'GUARDIAN_REQUEST_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'GUARDIAN_REQUEST_REJECTED';

-- 4. Notification gets the optional FK to AppUserGuardian.
ALTER TABLE "app_notifications"
  ADD COLUMN "app_user_guardian_id" TEXT
    REFERENCES "app_user_guardians"("id") ON DELETE CASCADE;
