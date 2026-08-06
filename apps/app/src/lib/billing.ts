import type Stripe from "stripe"
import type { Prisma, PrismaClient } from '@genealogiq/db'
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"

type PrismaLike = PrismaClient | Prisma.TransactionClient

/**
 * Compares two plans by their monthly price — the explicit `monthlyPrice`
 * when set (a real annual discount doesn't derive proportionally from
 * `price`), falling back to `price / termLength` otherwise.
 * Positive when `a` is the more expensive tier; 0 when equal.
 * Used to decide whether a plan change is an upgrade (immediate, prorated)
 * or a downgrade (deferred to period end).
 */
export function compareTier(
  a: { price: number; termLength: number; monthlyPrice?: number | null },
  b: { price: number; termLength: number; monthlyPrice?: number | null },
): number {
  const aMonthly = a.monthlyPrice ?? (a.price / Math.max(a.termLength, 1))
  const bMonthly = b.monthlyPrice ?? (b.price / Math.max(b.termLength, 1))
  return aMonthly - bMonthly
}

export async function ensureStripeCustomer(userId: string): Promise<string> {
  const user = await prisma.appUser.findUnique({
    where:  { id: userId },
    select: { stripeCustomerId: true, email: true, firstName: true, lastName: true },
  })
  if (!user) throw new Error("User not found")
  if (user.stripeCustomerId) return user.stripeCustomerId

  const customer = await stripe.customers.create({
    email:    user.email ?? undefined,
    name:     `${user.firstName} ${user.lastName}`.trim(),
    metadata: { appUserId: userId },
  })

  await prisma.appUser.update({
    where: { id: userId },
    data:  { stripeCustomerId: customer.id },
  })

  return customer.id
}

export async function upsertSaleFromSubscription(
  tx:  PrismaLike,
  sub: Stripe.Subscription,
): Promise<void> {
  const meta           = sub.metadata ?? {}
  const appUserId      = meta.userId
  const subscriptionId = meta.subscriptionId
  const cadence        = meta.cadence as "annual" | "monthly" | undefined

  // Subscriptions not created through our app carry no metadata; ignore safely.
  if (!appUserId || !subscriptionId || !cadence) return

  const item = sub.items.data[0]
  const priceId = item?.price.id ?? ""
  // In Stripe SDK v18+, current_period_end moved from the Subscription onto each item.
  const currentPeriodEnd = item?.current_period_end ?? Math.floor(Date.now() / 1000)

  const common = {
    status:            sub.status,
    currentPeriodEnd:  new Date(currentPeriodEnd * 1000),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    canceledAt:        sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
    endedAt:           sub.ended_at    ? new Date(sub.ended_at * 1000)    : null,
    stripePriceId:     priceId,
    // Captured from the real Stripe Price, never re-derived from the buyer's
    // locale — a subscription can't change currency mid-life.
    currency: item?.price.currency ? item.price.currency.toUpperCase() : null,
    // Include subscriptionId + cadence on update too so plan upgrades/downgrades
    // are reflected — Stripe gives us the new metadata after a subscriptions.update,
    // and without this the AppSale row keeps pointing at the previous tier.
    subscriptionId,
    cadence,
  }

  await tx.appSale.upsert({
    where:  { stripeSubscriptionId: sub.id },
    create: {
      ...common,
      appUserId,
      stripeSubscriptionId: sub.id,
    },
    update: common,
  })
}
