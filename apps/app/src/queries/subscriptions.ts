import "server-only"

import { prisma } from "@/lib/prisma"
import { FREE, PREMIUM, PHYSICAL_QR, type PlanQuotas } from "@/lib/plan-quotas"

// Subscription.code is a free-text field admins can edit in BMS (not a closed
// enum) — most rows resolve to a known tier, but a legacy/custom code falls
// back to `null` quotas rather than crashing the pricing page.
const PLAN_QUOTAS_BY_CODE: Record<string, PlanQuotas> = { FREE, PREMIUM, PHYSICAL_QR }

export async function getActiveSubscriptions() {
  const rows = await prisma.subscription.findMany({
    where:   { isActive: true },
    orderBy: { price: "asc" },
    select: {
      id:          true,
      code:        true,
      name:        true,
      description: true,
      maxProfiles: true,
      termLength:  true,
      price:       true,
    },
  })
  return rows.map((r) => ({
    ...r,
    price:  Number(r.price),
    quotas: PLAN_QUOTAS_BY_CODE[r.code] ?? null,
  }))
}

export type SubscriptionRow = Awaited<ReturnType<typeof getActiveSubscriptions>>[number]
