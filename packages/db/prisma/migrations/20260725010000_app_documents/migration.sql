-- Documents: profile-scoped PDF uploads (certidões, exames, cartas, documentos de
-- identidade, etc.). One category per document (unlike GeoPlace.categories, which
-- is a multi-select array) and a public/private toggle (public by default,
-- opt-out). Additive and idempotent so it can be re-applied safely.

CREATE TABLE IF NOT EXISTS "app_documents" (
  "id"           TEXT           NOT NULL,
  "title"        VARCHAR(120)   NOT NULL,
  "description"  VARCHAR(2000),
  "category"     VARCHAR(50)    NOT NULL,
  "file_url"     VARCHAR        NOT NULL,
  "file_name"    VARCHAR(255),
  "is_public"    BOOLEAN        NOT NULL DEFAULT true,
  "order"        INTEGER        NOT NULL DEFAULT 0,
  "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "app_user_id"  VARCHAR        NOT NULL,
  CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "documents_app_user_id_idx"
  ON "app_documents" ("app_user_id");

DO $$ BEGIN
  ALTER TABLE "app_documents"
    ADD CONSTRAINT "documents_app_user_id_fkey"
    FOREIGN KEY ("app_user_id") REFERENCES "app_users"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Per-plan cap on the number of documents a profile may upload (FREE = 10).
-- Enforcement is gated behind DOCUMENTS_ENFORCE_QUOTA at the app layer, so it
-- stays inert in dev until billing goes live.
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "documents_max" INTEGER NOT NULL DEFAULT 10;
