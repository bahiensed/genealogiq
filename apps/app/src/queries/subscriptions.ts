import "server-only"

import { prisma } from "@/lib/prisma"
import { FREE, PREMIUM, PHYSICAL_QR, type PlanQuotas } from "@/lib/plan-quotas"

// Subscription.code is a free-text field admins can edit in BMS (not a closed
// enum) — most rows resolve to a known tier, but a legacy/custom code falls
// back to `null` quotas rather than crashing the pricing page.
const PLAN_QUOTAS_BY_CODE: Record<string, PlanQuotas> = { FREE, PREMIUM, PHYSICAL_QR }

export async function getActiveSubscriptions() {
  const rows = await prisma.subscription.findMany({
    // Self-serve checkout only ever offers the plans this app actually sells
    // this way — a physical-QR license or any other admin-created row is
    // sold/tracked through a different channel, not this page.
    where:   { isActive: true, code: { in: ["FREE", "PREMIUM"] } },
    orderBy: { price: "asc" },
    select: {
      id:           true,
      code:         true,
      name:         true,
      description:  true,
      maxProfiles:  true,
      termLength:   true,
      price:        true,
      monthlyPrice: true,
    },
  })
  return rows.map((r) => ({
    ...r,
    price:        Number(r.price),
    monthlyPrice: r.monthlyPrice ? Number(r.monthlyPrice) : null,
    quotas:       PLAN_QUOTAS_BY_CODE[r.code] ?? null,
  }))
}

export type SubscriptionRow = Awaited<ReturnType<typeof getActiveSubscriptions>>[number]
