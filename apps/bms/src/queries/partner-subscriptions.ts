import 'server-only'

import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'

/**
 * Partner contracts, newest first — the list that replaced the Sale table.
 *
 * A contract's state is read from two places on purpose: `status` says what
 * Stripe reports about the money, and `currentCycle` says which period the
 * partner is living in. A PENDING contract with no cycle is a link that was
 * generated and never paid; an ACTIVE one always has a cycle.
 */
export async function getPartnerSubscriptions() {
  await verifySession()

  const rows = await prisma.partnerSubscription.findMany({
    select: {
      id: true, status: true, autoRenew: true, createdAt: true,
      founderRolloverEligible: true, founderRolloverUsed: true,
      stripeSubscriptionId: true,
      tenant: { select: { id: true, name: true } },
      plan:   { select: { id: true, name: true, code: true, annualAllowance: true } },
      currentCycle: {
        select: { id: true, startAt: true, endAt: true, graceEndAt: true, status: true, priceSnapshot: true },
      },
      _count: { select: { cycles: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return rows.map((r) => ({
    ...r,
    // The financial snapshot is JSON; surface only what the list actually shows
    // rather than leaking the whole frozen record into the client bundle.
    amountPaid: readSnapshotAmount(r.currentCycle?.priceSnapshot),
    currency:   readSnapshotCurrency(r.currentCycle?.priceSnapshot),
    cadence:    readSnapshotCadence(r.currentCycle?.priceSnapshot),
    currentCycle: r.currentCycle
      ? {
          id: r.currentCycle.id, startAt: r.currentCycle.startAt,
          endAt: r.currentCycle.endAt, graceEndAt: r.currentCycle.graceEndAt,
          status: r.currentCycle.status,
        }
      : null,
  }))
}

export async function getPartnerSubscription(id: string) {
  await verifySession()

  return prisma.partnerSubscription.findUnique({
    where: { id },
    select: {
      id: true, status: true, autoRenew: true, createdAt: true,
      founderRolloverEligible: true, founderRolloverUsed: true,
      stripeSubscriptionId: true, stripeCustomerId: true,
      tenant: { select: { id: true, name: true, email: true } },
      plan:   { select: { id: true, name: true, code: true, annualAllowance: true } },
      cycles: {
        select: {
          id: true, startAt: true, endAt: true, graceEndAt: true, status: true,
          renewedFromCycleId: true, stripeInvoiceId: true, priceSnapshot: true,
        },
        orderBy: { startAt: 'desc' },
      },
    },
  })
}

function snapshotField(snapshot: unknown, key: string): unknown {
  if (!snapshot || typeof snapshot !== 'object') return null
  return (snapshot as Record<string, unknown>)[key] ?? null
}

/** Cents, as Stripe reported them on the invoice that opened the cycle. */
function readSnapshotAmount(snapshot: unknown): number | null {
  const v = snapshotField(snapshot, 'amountPaid')
  return typeof v === 'number' ? v : null
}

function readSnapshotCurrency(snapshot: unknown): string | null {
  const v = snapshotField(snapshot, 'currency')
  return typeof v === 'string' ? v : null
}

function readSnapshotCadence(snapshot: unknown): string | null {
  const v = snapshotField(snapshot, 'cadence')
  return typeof v === 'string' ? v : null
}

export type PartnerSubscriptionRow = Awaited<ReturnType<typeof getPartnerSubscriptions>>[number]
