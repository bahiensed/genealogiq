-- Manual drag-to-reposition offset for one person's card within one family
-- tree, applied on top of computeLayout()'s output. `generation` snapshots
-- the layout engine's BFS generation for the person at save-time, so the app
-- can detect and ignore a stale override after the tree reshapes. Additive
-- and idempotent so it can be re-applied safely.

CREATE TABLE IF NOT EXISTS "app_tree_node_positions" (
  "id"         TEXT             NOT NULL,
  "root_id"    TEXT             NOT NULL,
  "person_id"  TEXT             NOT NULL,
  "dx"         DOUBLE PRECISION NOT NULL,
  "dy"         DOUBLE PRECISION NOT NULL,
  "generation" INTEGER          NOT NULL,
  "created_at" TIMESTAMP(3)     NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP(3)     NOT NULL DEFAULT NOW(),
  CONSTRAINT "tree_node_positions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tree_node_positions_root_person_key"
  ON "app_tree_node_positions" ("root_id", "person_id");

CREATE INDEX IF NOT EXISTS "tree_node_positions_root_id_idx"
  ON "app_tree_node_positions" ("root_id");

DO $$ BEGIN
  ALTER TABLE "app_tree_node_positions"
    ADD CONSTRAINT "tree_node_positions_root_id_fkey"
    FOREIGN KEY ("root_id") REFERENCES "app_users"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "app_tree_node_positions"
    ADD CONSTRAINT "tree_node_positions_person_id_fkey"
    FOREIGN KEY ("person_id") REFERENCES "app_users"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
