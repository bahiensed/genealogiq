-- Reconciles drift that predates the franchise work.
--
-- The schema's own header promises an acceptance gate: `prisma migrate diff`
-- against production reports no difference. It has not held for a while — three
-- unrelated deltas kept surfacing in every diff, which meant every new migration
-- had to be hand-filtered to avoid dragging them along. That is exactly how
-- unrelated DDL ends up riding into a release nobody reviewed it for.
--
-- All three are safe:
--
--   app_extra_unit_purchases — buyer_id is VARCHAR in the DB and TEXT in the
--   schema, and created_at differs in precision. The table is empty, so the
--   rewrite touches no rows. Its FK is dropped and re-added because Postgres
--   will not alter a column a constraint depends on.
--
--   app_push_subscriptions / app_tree_node_positions — updated_at carries a DB
--   DEFAULT that the schema does not declare. Prisma's @updatedAt sets the value
--   on every write, so the default never fires; dropping it only matters to a
--   raw INSERT that bypasses the client, and there is none.
--
--   app_tree_node_positions' primary key kept its pre-rename name from
--   20260824000000_rename_gencodes. Renaming a constraint is metadata only.

-- DropForeignKey
ALTER TABLE "app_extra_unit_purchases" DROP CONSTRAINT "app_extra_unit_purchases_buyer_id_fkey";

-- AlterTable
ALTER TABLE "app_extra_unit_purchases" ALTER COLUMN "buyer_id" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "app_push_subscriptions" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "app_tree_node_positions" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "app_tree_node_positions" RENAME CONSTRAINT "tree_node_positions_pkey" TO "app_tree_node_positions_pkey";

-- AddForeignKey
ALTER TABLE "app_extra_unit_purchases" ADD CONSTRAINT "app_extra_unit_purchases_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
