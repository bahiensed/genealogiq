-- Lowers PREMIUM's combined image pool from 1024 to 512.
--
-- 1024 came from 20260803010000_subscription_quota_columns, which moved the
-- APP's hardcoded plan numbers into real columns. It was a transcription of
-- what plan-quotas.ts already said, not a number anyone costed.
--
-- It has been costed now. Vercel Blob is USD 0.023/GB-month and every upload
-- path already compresses client-side (image-compress.ts: canvas, maxDim 2048
-- for content, quality 0.85), so a phone photo lands at roughly 400 KB. At 1024
-- the image pool alone reserves ~410 MB per profile; at 512 it reserves ~205 MB.
--
-- That matters because the B2C activation trial grants PREMIUM to the GUARDIAN,
-- and the media pool is per-profile (see queries/media-usage.ts) — so one
-- redeemed plaque can put the guardian's own profile plus up to six memorials
-- and five pets on PREMIUM quotas at once. Halving the pool takes the worst-case
-- storage cost of a single trial from about BRL 20/year to BRL 17/year against
-- unit revenue of BRL 25.50-29.90.
--
-- Data only: the column and its DEFAULT 32 (which is FREE's number) are
-- untouched, so schema.prisma does not move and `migrate diff` stays clean.
-- BMS can still edit this from the Subscriptions screen without a deploy —
-- that is what the quota columns exist for. This migration only resets the
-- starting point.
UPDATE "subscriptions"
SET "media_max_images" = 512
WHERE "code" = 'PREMIUM'
  AND "media_max_images" = 1024;
