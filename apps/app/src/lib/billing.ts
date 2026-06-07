import type Stripe from "stripe"
import type { Prisma, PrismaClient } from '@genealogiq/db'
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"

type PrismaLike = PrismaClient | Prisma.TransactionClient

/**
 * Compares two plans by their normalized monthly price (price / termLength).
 * Positive when `a` is the more expensive tier; 0 when equal.
 * Used to decide whether a plan change is an upgrade (immediate, prorated)
 * or a downgrade (deferred to period end).
 */
export function compareTier(
  a: { price: number; termLength: number },
  b: { price: number; termLength: number },
): number {
  const aMonthly = a.price / Math.max(a.termLength, 1)
  const bMonthly = b.price / Math.max(b.termLength, 1)
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
