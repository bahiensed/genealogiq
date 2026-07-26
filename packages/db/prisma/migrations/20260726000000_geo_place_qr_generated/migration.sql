-- Once a place's QR code has been generated (client click), remember it so
-- the detail page renders the code directly on future loads instead of the
-- "Generate QR code" button. Additive and idempotent.

ALTER TABLE "app_geo_places" ADD COLUMN IF NOT EXISTS "qr_generated" BOOLEAN NOT NULL DEFAULT false;
