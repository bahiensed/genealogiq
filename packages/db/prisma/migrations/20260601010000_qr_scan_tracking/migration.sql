-- Add scan tracking fields to qr_codes (idempotent)
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "scan_count"      INTEGER   NOT NULL DEFAULT 0;
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "last_scanned_at" TIMESTAMP(3);

-- CreateTable qr_scans (idempotent)
CREATE TABLE IF NOT EXISTS "qr_scans" (
  "id"         TEXT         NOT NULL,
  "qr_code_id" TEXT         NOT NULL,
  "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "user_agent" VARCHAR(512),
  "ip_hash"    TEXT,
  CONSTRAINT "qr_scans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "qr_scans_qr_code_id_idx" ON "qr_scans"("qr_code_id");
CREATE INDEX IF NOT EXISTS "qr_scans_scanned_at_idx"  ON "qr_scans"("scanned_at");

-- AddForeignKey (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'qr_scans_qr_code_id_fkey'
  ) THEN
    ALTER TABLE "qr_scans"
      ADD CONSTRAINT "qr_scans_qr_code_id_fkey"
      FOREIGN KEY ("qr_code_id")
      REFERENCES "qr_codes"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
