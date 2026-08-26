#!/usr/bin/env node
/**
 * Resets the transactional layer to zero, keeping the catalogue and every
 * profile the APP owns.
 *
 * Written for the migration to the franchise/credit-ledger model, where the
 * old Sale/GenCode rows describe a product that no longer exists. It is kept
 * because it is equally the tool for resetting a staging or preview database
 * to a clean commercial state without touching the content that makes those
 * environments useful to test against.
 *
 * WIPES    gencodes, sales, app_extra_unit_purchases, app_sales, stripe_events
 * PRESERVES tenants, users, app_users and all APP content (bios, galleries,
 *           tributes, family relations, documents, guardians), plus the
 *           catalogue: subscriptions, packages, discount_coupons,
 *           app_extra_unit_prices.
 *
 * Order matters: gencodes carries the only FK into sales, so it goes first.
 * Everything runs in ONE transaction — a partial wipe is worse than no wipe,
 * because it leaves gencodes pointing at sales that are gone.
 *
 * Deliberately NOT a Prisma migration. This is data, not schema: it must not
 * replay on every environment `migrate deploy` touches, and it must never run
 * itself in CI.
 *
 * Dry-run by default. Pass --confirm to actually delete.
 */
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const pg = require('pg')

const TABLES = ['gencodes', 'sales', 'app_extra_unit_purchases', 'app_sales', 'stripe_events']
const confirm = process.argv.includes('--confirm')

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Run with --env-file=packages/db/.env')
  process.exit(1)
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

const counts = {}
for (const t of TABLES) {
  counts[t] = (await client.query(`SELECT count(*)::int AS n FROM "${t}"`)).rows[0].n
}
const total = Object.values(counts).reduce((a, b) => a + b, 0)

console.log(confirm ? 'DELETING:' : 'DRY RUN — nothing will be deleted:')
for (const t of TABLES) console.log(`  ${t.padEnd(28)} ${counts[t]}`)
console.log(`  ${'TOTAL'.padEnd(28)} ${total}`)

if (!confirm) {
  console.log('\nRe-run with --confirm to apply.')
  await client.end()
  process.exit(0)
}

try {
  await client.query('BEGIN')
  for (const t of TABLES) await client.query(`DELETE FROM "${t}"`)
  await client.query('COMMIT')
} catch (err) {
  await client.query('ROLLBACK')
  console.error('Rolled back — nothing was deleted.', err)
  process.exit(1)
}

for (const t of TABLES) {
  const n = (await client.query(`SELECT count(*)::int AS n FROM "${t}"`)).rows[0].n
  if (n !== 0) { console.error(`${t} still holds ${n} rows`); process.exit(1) }
}
console.log('\nDone. All target tables are empty.')
await client.end()
