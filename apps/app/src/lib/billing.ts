import type Stripe from "stripe"
import type { Prisma, PrismaClient } from '@genealogiq/db'
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"

type PrismaLike = PrismaClient | Prisma.TransactionClient

// compareTier moved to @genealogiq/services/subscription-price, alongside the
// price book it now reads from. Keeping a second copy here would have meant two
// answers to "is this an upgrade", and that answer decides whether someone is
// charged today or at the end of their period.

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

/**
 * Mirrors a just-completed Checkout Session into the DB synchronously, on
 * the very request that renders the success page — the customer.subscription
 * webhook remains the source of truth (idempotent upsert below), but it's a
 * separate async HTTP delivery from Stripe that routinely arrives AFTER the
 * browser is already back on success_url, which left the pricing page
 * showing the old (FREE) badge until the webhook eventually landed.
 *
 * Card payments are guaranteed "complete" by the time the browser is
 * redirected here, so this closes the race for the common case. Delayed
 * payment methods (boleto, OXXO — relevant given this app's BRL/MXN support)
 * are still "open"/pending at redirect time; those fall through to the
 * webhook as before, same as they always have.
 */
export async function applyCheckoutSessionSync(sessionId: string): Promise<void> {
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] })
  if (session.mode !== "subscription" || session.status !== "complete") return
  const sub = session.subscription
  if (!sub || typeof sub === "string") return
  await upsertSaleFromSubscription(prisma, sub)
}
