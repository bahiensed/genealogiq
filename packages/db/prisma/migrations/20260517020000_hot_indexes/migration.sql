-- Hot-path indexes that were missing in production:
--  - app_bio_images.bio_id: every bio render runs `findMany({ where: { bioId } })`.
--  - app_users.tenant_id: SEQ scopes nearly every AppUser query by tenant.
--  - app_tributes.app_author_id: "My tributes" listings and author moderation.
--  - app_notifications.app_user_guardian_id: guardian-request notifications.
--
-- All defensive — CREATE INDEX IF NOT EXISTS so the migration is safe even
-- if any of these already exist on some environment.

CREATE INDEX IF NOT EXISTS "app_bio_images_bio_id_idx"
  ON "app_bio_images"("bio_id");

CREATE INDEX IF NOT EXISTS "app_users_tenant_id_idx"
  ON "app_users"("tenant_id");

CREATE INDEX IF NOT EXISTS "app_tributes_app_author_id_idx"
  ON "app_tributes"("app_author_id");

CREATE INDEX IF NOT EXISTS "app_notifications_app_user_guardian_id_idx"
  ON "app_notifications"("app_user_guardian_id");
