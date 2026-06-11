/**
 * Assign a guardian's active subscription plan to their EXISTING memorials that
 * still have no plan (appSaleId == null).
 *
 * The normal flow only assigns a plan slot at memorial-creation time
 * (createMemorial → picks the first AppSale with a free slot). So a memorial
 * created BEFORE the guardian had an active plan — or a plan granted manually
 * after the memorials existed — stays on the FREE tier, locking QR-Code,
 * geolocation, bio, gallery and tree limits. This backfills those assignments.
 *
 * Oldest memorials are filled first, up to each subscription's maxProfiles.
 * Memorials beyond the available slots are reported and left unassigned.
 *
 * Usage (from apps/app):
 *   npx tsx scripts/assign-plan-to-memorials.ts <guardian-app-user-id> [--dry-run]
 */

import 'dotenv/config'
import { prisma } from '@genealogiq/db'

const args       = process.argv.slice(2)
const guardianId = args.find((a) => !a.startsWith('--'))
const dryRun     = args.includes('--dry-run')

if (!guardianId) {
  console.error('Usage: npx tsx scripts/assign-plan-to-memorials.ts <guardian-app-user-id> [--dry-run]')
  process.exit(1)
}

async function main() {
  const now = new Date()

  // Active sales (open-slot capacity), oldest first — matches createMemorial.
  const sales = await prisma.appSale.findMany({
    where:   { appUserId: guardianId, status: { in: ['active', 'trialing'] }, currentPeriodEnd: { gt: now } },
    orderBy: { createdAt: 'asc' },
    select:  {
      id:           true,
      subscription: { select: { code: true, maxProfiles: true } },
      _count:       { select: { assignedTo: true } },
    },
  })
  if (sales.length === 0) {
    console.log('No active subscription for this guardian — nothing to assign.')
    return
  }

  // ACCEPTED-guarded memorials with no plan yet, oldest first.
  const memorials = await prisma.appUser.findMany({
    where:   { role: 'APP_MEMO', appSaleId: null, guardedBy: { some: { guardianId, status: 'ACCEPTED' } } },
    orderBy: { createdAt: 'asc' },
    select:  { id: true, firstName: true, lastName: true, createdAt: true },
  })
  if (memorials.length === 0) {
    console.log('No unassigned memorials for this guardian — nothing to do.')
    return
  }

  const slots = sales.map((s) => ({
    id:   s.id,
    code: s.subscription.code,
    free: s.subscription.maxProfiles - s._count.assignedTo,
  }))
  const totalFree = slots.reduce((a, s) => a + Math.max(0, s.free), 0)
  console.log(`Guardian ${guardianId}: ${memorials.length} unassigned memorial(s), ${totalFree} free slot(s) across ${sales.length} sale(s).`)

  const planned: { id: string; name: string; saleId: string; code: string }[] = []
  const skipped: { id: string; name: string }[] = []

  for (const m of memorials) {
    const name = `${m.firstName} ${m.lastName}`
    const slot = slots.find((s) => s.free > 0)
    if (!slot) { skipped.push({ id: m.id, name }); continue }
    slot.free -= 1
    planned.push({ id: m.id, name, saleId: slot.id, code: slot.code })
  }

  for (const p of planned) console.log(`  ${dryRun ? '[dry] ' : ''}assign ${p.name} (${p.id}) → ${p.code} sale ${p.saleId}`)
  for (const s of skipped) console.log(`  SKIP (no free slot, over limit): ${s.name} (${s.id})`)

  if (dryRun) {
    console.log('\n[dry-run] No changes made.')
    return
  }

  for (const p of planned) {
    await prisma.appUser.update({ where: { id: p.id }, data: { appSaleId: p.saleId } })
  }
  console.log(`\n✅ Assigned ${planned.length} memorial(s). ${skipped.length} left unassigned (over subscription limit).`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
