import "server-only"

import { prisma } from "@/lib/prisma"

export async function getActivePlan(userId: string) {
  const row = await prisma.appSale.findFirst({
    where: {
      appUserId: userId,
      status:    { in: ["active", "trialing"] },
      currentPeriodEnd: { gt: new Date() },
    },
    orderBy: { currentPeriodEnd: "desc" },
    select: {
      id:                   true,
      cadence:              true,
      status:               true,
      currentPeriodEnd:     true,
      cancelAtPeriodEnd:    true,
      stripeSubscriptionId: true,
      subscription: {
        select: { id: true, code: true, name: true, price: true, termLength: true },
      },
    },
  })
  // currentPeriodEnd / status are nullable in schema (SEQ vendor sales share
  // this table) but the where-clause above guarantees both are set on hit.
  if (!row || !row.currentPeriodEnd || !row.status) return null
  return {
    ...row,
    currentPeriodEnd: row.currentPeriodEnd,
    status:           row.status,
    subscription:     { ...row.subscription, price: Number(row.subscription.price) },
  }
}

export type ActivePlan = NonNullable<Awaited<ReturnType<typeof getActivePlan>>>
