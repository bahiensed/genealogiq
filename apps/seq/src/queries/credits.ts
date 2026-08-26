import 'server-only'

import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'
import { getCreditBalance } from '@genealogiq/services/credits'
import { decideRollover } from '@genealogiq/services/rollover'

/**
 * What the partner needs to see about their allowance.
 *
 * Written to answer three questions the old inventory screen could not: how much
 * is left, when does it stop being usable, and what happens if they renew.
 *
 * The last one matters most. With rollover capped, a partner who lets credits
 * pile up loses them, and finding that out at renewal is finding out too late.
 */
export async function getCreditOverview() {
  const { customerId } = await verifyTenantSession()

  const [balance, contract] = await Promise.all([
    getCreditBalance(customerId),
    prisma.partnerSubscription.findFirst({
      where:  { tenantId: customerId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, status: true, autoRenew: true,
        founderRolloverEligible: true, founderRolloverUsed: true,
        plan: { select: { name: true, annualAllowance: true, rolloverRate: true, rolloverValidityMonths: true } },
        currentCycle: { select: { id: true, startAt: true, endAt: true, graceEndAt: true, status: true } },
      },
    }),
  ])

  const bySource = await prisma.creditGrant.groupBy({
    by:     ['source'],
    where:  {
      tenantId: customerId, status: 'ACTIVE', remainingQty: { gt: 0 },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    _sum:   { remainingQty: true },
  })

  const [granted, consumed] = await Promise.all([
    prisma.creditTransaction.aggregate({
      where: { tenantId: customerId, type: 'GRANT' }, _sum: { quantity: true },
    }),
    prisma.creditTransaction.aggregate({
      where: { tenantId: customerId, type: 'CONSUME' }, _sum: { quantity: true },
    }),
  ])

  const grantedTotal  = granted._sum.quantity ?? 0
  const consumedTotal = consumed._sum.quantity ?? 0

  // "What would carry over if you renewed today" — shown so the decision is
  // made with the number in front of them, not discovered afterwards.
  const projectedRollover = contract?.plan
    ? decideRollover({
        unused:           balance.general,
        renewedAllowance: contract.plan.annualAllowance,
        rolloverRate:     Number(contract.plan.rolloverRate),
        founderEligible:  contract.founderRolloverEligible,
        founderUsed:      contract.founderRolloverUsed,
      })
    : null

  return {
    balance,
    bySource: bySource.map((g) => ({ source: g.source, quantity: g._sum.remainingQty ?? 0 })),
    contract: contract && {
      status:    contract.status,
      autoRenew: contract.autoRenew,
      planName:  contract.plan.name,
      allowance: contract.plan.annualAllowance,
      cycle:     contract.currentCycle,
    },
    sellThrough: {
      granted:  grantedTotal,
      consumed: consumedTotal,
      // Null rather than zero when nothing was granted: no sell-through is not
      // the same as a bad one.
      rate: grantedTotal > 0 ? Math.round((consumedTotal / grantedTotal) * 1000) / 1000 : null,
    },
    projectedRollover,
  }
}
