-- Precise geolocation is a free feature now, so the per-plan flag that gated it
-- has nothing left to decide.
--
-- It used to blank a memorial's coordinates to 0/0 on both write and read for
-- any tier without the flag, and disable the coordinate inputs in the APP. All
-- of that is gone: coordinates are stored and returned as submitted, for
-- everyone.

ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "geolocation_full_access";
