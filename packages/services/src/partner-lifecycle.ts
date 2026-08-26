import 'server-only'

import { prisma } from '@genealogiq/db'
import { expireDueGrants } from './credits'

/**
 * The deadlines that are ours, not Stripe's.
 *
 * Stripe knows whether money arrived. It does not know that a partner had until
 * D+30 to renew and preserve their rollover, or that at D+31 their unused
 * allowance is gone. Those are contract terms, frozen on the cycle when it
 * opened, and this is what enforces them.
 *
 * Deliberately separate from the webhook: nothing here reacts to an event, it
 * reacts to a date passing.
 */

export interface LifecycleSweep {
  pastDue:        number
  expired:        number
  grantsExpired:  number
}

/**
 * Advances every contract whose deadline has passed.
 *
 * Runs from the daily cron, and is bookkeeping rather than enforcement: reads
 * already ignore an expired grant, so a late or failed run cannot let anyone
 * activate on a dead credit. What it buys is a ledger that explains itself and
 * a status a human can read.
 *
 * Written to be safe to run twice — every step is a conditional update, so a
 * retried job changes nothing the first run already did.
 */
export async function sweepPartnerLifecycle(now = new Date()): Promise<LifecycleSweep> {
  // D0 — the cycle ran out. The partner keeps their balance, visibly, but the
  // contract stops reading as current. Stripe may still report `active` here if
  // they are mid-instalment, which is why this is a date check and not a status
  // mirror.
  const pastDue = await prisma.partnerSubscription.updateMany({
    where: {
      status:       'ACTIVE',
      currentCycle: { endAt: { lte: now }, status: 'ACTIVE' },
    },
    data: { status: 'PAST_DUE' },
  })

  // D+31 — grace is over. Paying after this starts a new contract; it does not
  // recover the old balance.
  const expired = await prisma.partnerSubscription.updateMany({
    where: {
      status:       'PAST_DUE',
      currentCycle: { graceEndAt: { lt: now } },
    },
    data: { status: 'EXPIRED' },
  })

  await prisma.subscriptionCycle.updateMany({
    where: { status: 'ACTIVE', graceEndAt: { lt: now } },
    data:  { status: 'EXPIRED' },
  })

  const grantsExpired = await expireDueGrants(now)

  return { pastDue: pastDue.count, expired: expired.count, grantsExpired }
}

/** How a partner's contract reads to the dashboard, in one shape. */
export interface RenewalWindow {
  subscriptionId: string
  tenantId:       string
  /** Negative before the cycle ends, positive after. */
  daysFromEnd:    number
  endAt:          Date
  graceEndAt:     Date
}

/**
 * Contracts sitting on one of the notification milestones today.
 *
 * The spec lists eight moments — D-90, D-60, D-30, D-7, D0, D+15, D+30, D+31 —
 * and they are computed from the cycle's own dates rather than scheduled
 * separately. On Vercel Hobby a cron runs at most daily and drifts by up to an
 * hour, so eight schedules would be eight chances to miss a day; one query that
 * asks "who is N days out today" cannot drift apart from itself.
 */
export async function findRenewalMilestones(
  milestones: number[],
  now = new Date(),
): Promise<Map<number, RenewalWindow[]>> {
  const cycles = await prisma.subscriptionCycle.findMany({
    where:  { status: { in: ['ACTIVE', 'CLOSED'] } },
    select: {
      endAt: true, graceEndAt: true,
      subscription: { select: { id: true, tenantId: true, autoRenew: true } },
    },
  })

  const startOfDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  const today = startOfDay(now)
  const result = new Map<number, RenewalWindow[]>(milestones.map((m) => [m, []]))

  for (const cycle of cycles) {
    const days = Math.round((today - startOfDay(cycle.endAt)) / 86_400_000)
    const bucket = result.get(days)
    if (!bucket) continue
    bucket.push({
      subscriptionId: cycle.subscription.id,
      tenantId:       cycle.subscription.tenantId,
      daysFromEnd:    days,
      endAt:          cycle.endAt,
      graceEndAt:     cycle.graceEndAt,
    })
  }

  return result
}

/** The spec's §13 timeline, as day offsets from the cycle's end. */
export const RENEWAL_MILESTONES = [-90, -60, -30, -7, 0, 15, 30, 31] as const
