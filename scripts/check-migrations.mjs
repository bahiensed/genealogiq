#!/usr/bin/env node
/**
 * Structural guard for the Prisma migration folder. Runs in PR CI with NO
 * database credential — it never connects; it only checks the things that
 * silently break `migrate deploy` later:
 *
 *  1. every migration directory holds a migration.sql
 *  2. names are unique and sort chronologically (Prisma applies them in
 *     lexicographic order, so a timestamp that sorts before an already-applied
 *     one is applied out of order or skipped)
 *  3. migration.sql is not empty
 *
 * The one thing it deliberately does NOT do is diff the schema against the
 * database — that needs production access, and it belongs to the Migrate
 * workflow, which reports `migrate status` before and after applying.
 */
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

const DIR = "packages/db/prisma/migrations"
// The squashed baseline from the three-repo consolidation. Prisma's own
// baselining convention, and it sorts first, so it is exempt from the
// timestamp rule rather than a violation of it.
const BASELINE = "0_init"
const errors = []

const entries = readdirSync(DIR)
  .filter((n) => statSync(join(DIR, n)).isDirectory())
  .sort()

if (entries.length === 0) errors.push(`${DIR} has no migrations`)

const seenStamps = new Map()

for (const name of entries) {
  const sqlPath = join(DIR, name, "migration.sql")
  let sql
  try {
    sql = readFileSync(sqlPath, "utf8")
  } catch {
    errors.push(`${name}: missing migration.sql`)
    continue
  }
  if (sql.trim().length === 0) errors.push(`${name}: migration.sql is empty`)

  if (name === BASELINE) continue

  const stamp = name.slice(0, 14)
  if (!/^\d{14}$/.test(stamp)) {
    errors.push(`${name}: does not start with a 14-digit timestamp`)
    continue
  }
  if (seenStamps.has(stamp)) {
    errors.push(`${name}: shares its timestamp with ${seenStamps.get(stamp)} — ordering is ambiguous`)
  }
  seenStamps.set(stamp, name)
}

if (errors.length > 0) {
  for (const e of errors) console.error(`✖ ${e}`)
  console.error(`\nmigration gate: ${errors.length} error(s).`)
  process.exit(1)
}

console.log(`✓ ${entries.length} migrations well-formed and uniquely ordered.`)
