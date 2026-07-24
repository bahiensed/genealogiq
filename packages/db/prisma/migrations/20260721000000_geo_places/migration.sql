-- Geolocalizações (plural): many life-places per profile, distinct from the
-- singular `app_geolocations` resting-place record (kept intact). Each place has
-- coordinates, photo URLs, categories and optional start/end dates. Additive and
-- idempotent so it can be re-applied safely.

CREATE TABLE IF NOT EXISTS "app_geo_places" (
  "id"           TEXT             NOT NULL,
  "title"        VARCHAR(120)     NOT NULL,
  "description"  VARCHAR(2000),
  "categories"   TEXT[]           NOT NULL DEFAULT ARRAY[]::TEXT[],
  "lat"          DOUBLE PRECISION NOT NULL,
  "lon"          DOUBLE PRECISION NOT NULL,
  "zip"          VARCHAR,
  "street"       VARCHAR(200),
  "number"       VARCHAR(20),
  "complement"   VARCHAR(200),
  "neighborhood" VARCHAR(100),
  "city"         VARCHAR(100),
  "state"        VARCHAR(100),
  "country"      VARCHAR(100),
  "photos"       TEXT[]           NOT NULL DEFAULT ARRAY[]::TEXT[],
  "start_date"   TIMESTAMP(6),
  "end_date"     TIMESTAMP(6),
  "order"        INTEGER          NOT NULL DEFAULT 0,
  "created_at"   TIMESTAMPTZ(6)   NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ(6)   NOT NULL DEFAULT NOW(),
  "app_user_id"  VARCHAR          NOT NULL,
  CONSTRAINT "geo_places_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "geo_places_app_user_id_idx"
  ON "app_geo_places" ("app_user_id");

DO $$ BEGIN
  ALTER TABLE "app_geo_places"
    ADD CONSTRAINT "geo_places_app_user_id_fkey"
    FOREIGN KEY ("app_user_id") REFERENCES "app_users"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Per-plan cap on the number of geo-places a profile may create (FREE = 3).
-- Enforcement is gated behind GEO_PLACES_ENFORCE_QUOTA at the app layer, so it
-- stays inert in dev until billing goes live.
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "geo_places_max" INTEGER NOT NULL DEFAULT 3;
