import 'server-only'

import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'

export type LicenseStatus = 'AVAILABLE' | 'SOLD' | 'ACTIVATED'

export async function getLicenses(status?: LicenseStatus) {
  const { customerId } = await verifyTenantSession()

  return prisma.genCode.findMany({
    where: {
      tenantId: customerId,
      ...(status ? { status } : {}),
    },
    select: {
      id:          true,
      genCode:     true,
      status:      true,
      printedAt:   true,
      soldAt:      true,
      soldVia:     true,
      soldToName:  true,
      activatedAt: true,
      createdAt:   true,
      appUser:       { select: { firstName: true, lastName: true } },
      soldToAppUser: { select: { firstName: true, lastName: true } },
      mintedInCycle: { select: { id: true, endAt: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getLicenseSummary() {
  const { customerId } = await verifyTenantSession()
  const where = { tenantId: customerId }

  const [total, available, sold, activated] = await Promise.all([
    prisma.genCode.count({ where }),
    prisma.genCode.count({ where: { ...where, status: 'AVAILABLE' } }),
    prisma.genCode.count({ where: { ...where, status: 'SOLD' } }),
    prisma.genCode.count({ where: { ...where, status: 'ACTIVATED' } }),
  ])

  return { total, available, sold, activated }
}

/** Single license by genCode, tenant-scoped — for the detail page. */
export async function getLicenseByGenCode(genCode: string) {
  const { customerId } = await verifyTenantSession()

  return prisma.genCode.findFirst({
    where:  { genCode, tenantId: customerId },
    select: {
      id:          true,
      genCode:     true,
      status:      true,
      printedAt:   true,
      soldAt:      true,
      soldVia:     true,
      soldToName:  true,
      soldValue:   true,
      activatedAt: true,
      createdAt:   true,
      appUser:       { select: { id: true, firstName: true, lastName: true } },
      soldToAppUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      soldBy:        { select: { firstName: true, lastName: true } },
    },
  })
}

// Stripe caps a Checkout Session at 24h (see BMS's send-plan-link-form note);
// past that the link Stripe emailed is dead even though nothing tells our side
// so — Stripe never fires a webhook for it (see partner-billing.ts). Derived
// here from elapsed time rather than a stored status, since it is a fact about
// the clock, not an event we were ever notified of.
const CHECKOUT_LINK_TTL_MS = 24 * 60 * 60 * 1000

/** Plan purchases sent to this tenant that are still unpaid — awaiting the
 *  checkout link, or past the point Stripe would have let it be paid. */
export async function getPendingPlanOrders() {
  const { customerId } = await verifyTenantSession()

  const orders = await prisma.partnerSubscription.findMany({
    where:  { tenantId: customerId, status: 'PENDING' },
    select: {
      id:        true,
      createdAt: true,
      plan:      { select: { name: true, annualAllowance: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const now = Date.now()
  return orders.map((order) => ({
    ...order,
    linkExpired: now - order.createdAt.getTime() > CHECKOUT_LINK_TTL_MS,
  }))
}

export type LicenseRow = Awaited<ReturnType<typeof getLicenses>>[number]
export type LicenseDetail = NonNullable<Awaited<ReturnType<typeof getLicenseByGenCode>>>
export type PendingPlanOrder = Awaited<ReturnType<typeof getPendingPlanOrders>>[number]
