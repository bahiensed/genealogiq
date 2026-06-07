-- CreateEnum (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QrStatus') THEN
    CREATE TYPE "QrStatus" AS ENUM ('PENDING', 'PRINTED', 'INSTALLED');
  END IF;
END $$;

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "qr_codes" (
  "id"           TEXT         NOT NULL,
  "url"          TEXT         NOT NULL,
  "status"       "QrStatus"   NOT NULL DEFAULT 'PENDING',
  "printed_at"   TIMESTAMP(3),
  "installed_at" TIMESTAMP(3),
  "app_user_id"  TEXT         NOT NULL,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "qr_codes_app_user_id_key" ON "qr_codes"("app_user_id");

-- AddForeignKey (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'qr_codes_app_user_id_fkey'
  ) THEN
    ALTER TABLE "qr_codes"
      ADD CONSTRAINT "qr_codes_app_user_id_fkey"
      FOREIGN KEY ("app_user_id")
      REFERENCES "app_users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
