/**
 * Cleanup test data for a given tenant.
 *
 * Deletes (in safe order):
 *   1. APP Users (app_users) with tenantId = tenant → CASCADE removes:
 *        app_family_relations, app_tributes, app_notifications,
 *        app_user_guardians, app_bios, app_bio_images,
 *        app_gallery_items, app_geolocations, app_favorites
 *   2. QR package Sales (sales) for the tenant
 *   3. QR Inventory (qr_inventory) for the tenant
 *
 * Does NOT delete:
 *   - The Tenant record itself
 *   - SEQ/BMS staff Users (users table, onDelete: SetNull — they keep their logins)
 *
 * Usage (from genealogiq-bms root):
 *   npx tsx scripts/cleanup-tenant.ts <name-or-id>
 *   npx tsx scripts/cleanup-tenant.ts <name-or-id> --dry-run
 *   npx tsx scripts/cleanup-tenant.ts <name-or-id> --yes
 */

import 'dotenv/config'
import * as readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

// ─── Args ─────────────────────────────────────────────────────────────────────

const args    = process.argv.slice(2)
const nameOrId = args.find((a) => !a.startsWith('--'))
const dryRun  = args.includes('--dry-run')
const skipConfirm = args.includes('--yes') || args.includes('-y')

if (!nameOrId) {
  console.error('Usage: npx tsx scripts/cleanup-tenant.ts <name-or-id> [--dry-run] [--yes]')
  process.exit(1)
}

// ─── DB ───────────────────────────────────────────────────────────────────────

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function confirm(question: string): Promise<boolean> {
  if (skipConfirm) return true
  const rl = readline.createInterface({ input, output })
  const answer = await rl.question(`${question} [y/N] `)
  rl.close()
  return answer.trim().toLowerCase() === 'y'
}

type CountRow = { label: string; cnt: bigint }

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Find tenant
  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [
        { id: nameOrId },
        { name: { contains: nameOrId, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true },
  })

  if (!tenant) {
    console.error(`Tenant not found: "${nameOrId}"`)
    process.exit(1)
  }

  console.log(`\nTenant: ${tenant.name} (${tenant.id})`)

  // 2. Fetch APP user IDs for this tenant
  const appUsers = await prisma.$queryRaw<{ id: string; role: string; first_name: string | null; last_name: string | null; email: string | null }[]>`
    SELECT id, role, first_name, last_name, email
    FROM app_users
    WHERE tenant_id = ${tenant.id}
  `

  if (appUsers.length === 0) {
    console.log('\nNo APP users found for this tenant. Nothing to delete.')
    await prisma.$disconnect()
    return
  }

  const appIds = appUsers.map((u) => u.id)

  console.log(`\nAPP Users (${appUsers.length}):`)
  appUsers.forEach((u) => console.log(`  · [${u.role}] ${u.first_name ?? ''} ${u.last_name ?? ''} — ${u.email ?? 'no email'}`))

  // 3. Count all related data via raw SQL
  const counts = await prisma.$queryRaw<CountRow[]>`
    SELECT 'family_relations'  AS label, COUNT(*) AS cnt FROM app_family_relations WHERE app_from_id = ANY(${appIds}::text[]) OR app_to_id = ANY(${appIds}::text[])
    UNION ALL
    SELECT 'tributes',                   COUNT(*)         FROM app_tributes         WHERE app_profile_id = ANY(${appIds}::text[])
    UNION ALL
    SELECT 'notifications',              COUNT(*)         FROM app_notifications    WHERE user_id = ANY(${appIds}::text[])
    UNION ALL
    SELECT 'guardian_relations',         COUNT(*)         FROM app_user_guardians   WHERE guardian_id = ANY(${appIds}::text[]) OR app_user_id = ANY(${appIds}::text[])
    UNION ALL
    SELECT 'bios',                       COUNT(*)         FROM app_bios             WHERE app_user_id = ANY(${appIds}::text[])
    UNION ALL
    SELECT 'gallery_items',              COUNT(*)         FROM app_gallery_items    WHERE app_user_id = ANY(${appIds}::text[])
    UNION ALL
    SELECT 'geolocations',               COUNT(*)         FROM app_geolocations     WHERE app_user_id = ANY(${appIds}::text[])
    UNION ALL
    SELECT 'favorites',                  COUNT(*)         FROM app_favorites        WHERE app_user_id = ANY(${appIds}::text[]) OR app_target_id = ANY(${appIds}::text[])
    UNION ALL
    SELECT 'qr_package_sales',           COUNT(*)         FROM sales               WHERE tenant_id = ${tenant.id}
    UNION ALL
    SELECT 'qr_inventory',               COUNT(*)         FROM qr_inventory         WHERE tenant_id = ${tenant.id}
  `

  console.log('\nData to be deleted:')
  counts.forEach((r) => {
    if (Number(r.cnt) > 0) console.log(`  · ${r.label.padEnd(22)}: ${r.cnt}`)
  })

  if (dryRun) {
    console.log('\n[dry-run] No changes made.')
    await prisma.$disconnect()
    return
  }

  // 4. Confirm
  const ok = await confirm('\nProceed with deletion?')
  if (!ok) {
    console.log('Aborted.')
    await prisma.$disconnect()
    return
  }

  // 5. Delete in safe order
  // 5a. APP Users — CASCADE removes family_relations, tributes, notifications,
  //     guardian_relations, bios, bio_images, gallery_items, geolocations, favorites
  const delAppUsers = await prisma.$executeRaw`
    DELETE FROM app_users WHERE tenant_id = ${tenant.id}
  `
  console.log(`\nDeleted ${delAppUsers} app_user(s) (+ cascaded children)`)

  // 5b. QR package Sales
  const delSales = await prisma.$executeRaw`
    DELETE FROM sales WHERE tenant_id = ${tenant.id}
  `
  console.log(`Deleted ${delSales} sale(s)`)

  // 5c. QR Inventory
  const delInventory = await prisma.$executeRaw`
    DELETE FROM qr_inventory WHERE tenant_id = ${tenant.id}
  `
  console.log(`Deleted ${delInventory} qr_inventory row(s)`)

  console.log('\n✅ Done. Tenant record and SEQ/BMS staff logins untouched.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
