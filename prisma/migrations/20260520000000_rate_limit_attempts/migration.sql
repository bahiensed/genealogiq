-- Rate limit attempts table: tracks sliding-window auth attempt counts per key
-- (typically "<action>:ip:<address>"). Idempotent — uses IF NOT EXISTS so
-- the migration is safe to run from any of the three apps that share this DB.

CREATE TABLE IF NOT EXISTS "rate_limit_attempts" (
  "id"           SERIAL                      NOT NULL,
  "key"          TEXT                        NOT NULL,
  "attempted_at" TIMESTAMP(3) DEFAULT NOW()  NOT NULL,
  CONSTRAINT "rate_limit_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "rate_limit_attempts_key_attempted_at_idx"
  ON "rate_limit_attempts" ("key", "attempted_at");

CREATE INDEX IF NOT EXISTS "rate_limit_attempts_attempted_at_idx"
  ON "rate_limit_attempts" ("attempted_at");
