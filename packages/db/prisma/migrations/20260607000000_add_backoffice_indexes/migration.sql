-- Back-office performance indexes (#38). Index names follow Prisma's convention
-- so the schema's @@index lines map 1:1 to these (no drift on future db pull).
-- Idempotent (IF NOT EXISTS) and surgical: indexes only — it deliberately does
-- NOT touch the two documented deviations (_CouponPackages PK, subscriptions
-- NOT NULL), which would be bundled if generated via `prisma migrate dev`.
--
-- NOTE for large tables: a plain CREATE INDEX takes a brief write lock. If any of
-- these tables is large enough that the lock matters, run the equivalent
-- `CREATE INDEX CONCURRENTLY` directly against the branch/prod (CONCURRENTLY cannot
-- run inside Prisma's transactional migration), then `prisma migrate resolve
-- --applied 20260607000000_add_backoffice_indexes`.

-- AppSale.appUserId — hottest: getMemorialFeatures() looks up the buyer's live
-- subscription on every memorial profile view.
CREATE INDEX IF NOT EXISTS "app_sales_app_user_id_idx" ON "app_sales"("app_user_id");

-- Sale: tenant-scoped sales list, newest first (SEQ).
CREATE INDEX IF NOT EXISTS "sales_tenant_id_created_at_idx" ON "sales"("tenant_id", "created_at" DESC);

-- User.tenantId — getUsers() filter + tenant-scoped user lookups.
CREATE INDEX IF NOT EXISTS "users_tenant_id_idx" ON "users"("tenant_id");

-- Category FK filters / joins.
CREATE INDEX IF NOT EXISTS "suppliers_category_id_idx" ON "suppliers"("category_id");
CREATE INDEX IF NOT EXISTS "tenants_category_id_idx" ON "tenants"("category_id");
CREATE INDEX IF NOT EXISTS "app_users_category_id_idx" ON "app_users"("category_id");
