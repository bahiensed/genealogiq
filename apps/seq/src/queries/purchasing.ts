import 'server-only'

import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'

// Stripe caps a Checkout Session at 24h (see BMS's send-plan-link-form note);
// past that the link Stripe emailed is dead even though nothing tells our side
// so — Stripe never fires a webhook for it (see partner-billing.ts). Derived
// here from elapsed time rather than a stored status, since it is a fact about
// the clock, not an event we were ever notified of.
const CHECKOUT_LINK_TTL_MS = 24 * 60 * 60 * 1000

/** Every plan order this tenant has ever placed — paid, pending, or dead. */
export async function getPlanOrders() {
  const { customerId } = await verifyTenantSession()

  const orders = await prisma.partnerSubscription.findMany({
    where:  { tenantId: customerId },
    select: {
      id:        true,
      status:    true,
      createdAt: true,
      plan:      { select: { name: true } },
      currentCycle: { select: { startAt: true, endAt: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const now = Date.now()
  return orders.map((order) => ({
    ...order,
    // Only meaningful for a still-PENDING order — see PlanOrdersTable.
    linkExpired: now - order.createdAt.getTime() > CHECKOUT_LINK_TTL_MS,
  }))
}

export type PlanOrder = Awaited<ReturnType<typeof getPlanOrders>>[number]
