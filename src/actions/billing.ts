"use server"

import { revalidatePath } from "next/cache"
import { verifySession } from "@/lib/dal"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { ensureStripeCustomer, compareTier, upsertSaleFromSubscription } from "@/lib/billing"

type ActionResult<T> = { error: string } | T

export async function createCheckoutSession(
  subscriptionId: string,
  cadence:        "annual" | "monthly",
): Promise<ActionResult<{ url: string }>> {
  const session = await verifySession()

  const plan = await prisma.subscription.findUnique({
    where:  { id: subscriptionId, isActive: true },
    select: {
      id: true, name: true,
      stripeAnnualPriceId:  true,
      stripeMonthlyPriceId: true,
    },
  })
  if (!plan) return { error: "Plan not found or unavailable." }

  const priceId = cadence === "annual" ? plan.stripeAnnualPriceId : plan.stripeMonthlyPriceId
  if (!priceId) return { error: "This plan is not yet wired in Stripe. Run prisma/seed-stripe.ts." }

  const customerId = await ensureStripeCustomer(session.user.id)
  const appUrl     = process.env.APP_URL ?? "http://localhost:3000"
  const metadata   = { userId: session.user.id, subscriptionId: plan.id, cadence }

  const checkout = await stripe.checkout.sessions.create({
    mode:                  "subscription",
    customer:              customerId,
    line_items:            [{ price: priceId, quantity: 1 }],
    client_reference_id:   session.user.id,
    metadata,
    subscription_data:     { metadata },
    success_url:           `${appUrl}/subscriptions?status=success`,
    cancel_url:            `${appUrl}/subscriptions?status=cancel`,
    allow_promotion_codes: true,
  })

  if (!checkout.url) return { error: "Stripe did not return a checkout URL." }
  return { url: checkout.url }
}

/**
 * Switches an existing subscriber to a different plan/cadence.
 * - Upgrade or cadence-only swap (target ≥ current): apply immediately, prorate, charge today
 * - Downgrade (target < current): schedule the switch for end of current period via Subscription Schedule
 */
export async function changeSubscription(
  subscriptionId: string,
  cadence:        "annual" | "monthly",
): Promise<ActionResult<{ effect: "upgraded" | "scheduled" }>> {
  const session = await verifySession()

  // Active subscription (none = caller should use createCheckoutSession instead)
  const active = await prisma.appSale.findFirst({
    where: {
      appUserId: session.user.id,
      status:    { in: ["active", "trialing"] },
      currentPeriodEnd: { gt: new Date() },
    },
    orderBy: { currentPeriodEnd: "desc" },
    select: {
      stripeSubscriptionId: true,
      subscription: { select: { price: true, termLength: true } },
    },
  })
  if (!active) return { error: "No active subscription to switch from." }

  const target = await prisma.subscription.findUnique({
    where:  { id: subscriptionId, isActive: true },
    select: { id: true, price: true, termLength: true, stripeAnnualPriceId: true, stripeMonthlyPriceId: true },
  })
  if (!target) return { error: "Plan not found or unavailable." }
  const targetPriceId = cadence === "annual" ? target.stripeAnnualPriceId : target.stripeMonthlyPriceId
  if (!targetPriceId) return { error: "This plan is not yet wired in Stripe." }

  const cmp = compareTier(
    { price: Number(target.price), termLength: target.termLength },
    { price: Number(active.subscription.price), termLength: active.subscription.termLength },
  )

  const metadata = { userId: session.user.id, subscriptionId: target.id, cadence }

  try {
    if (cmp >= 0) {
      // Upgrade or cadence-only swap: replace the price on the existing subscription, prorate, charge now.
      const sub = await stripe.subscriptions.retrieve(active.stripeSubscriptionId)
      const itemId = sub.items.data[0]?.id
      if (!itemId) return { error: "Active subscription has no items in Stripe." }

      const updated = await stripe.subscriptions.update(active.stripeSubscriptionId, {
        items:              [{ id: itemId, price: targetPriceId }],
        proration_behavior: "always_invoice",
        metadata,
      })

      // Mirror the change to our DB immediately so the page refresh shows the new
      // plan without waiting for the customer.subscription.updated webhook. The
      // webhook will also fire and upsert again — idempotent via stripeSubscriptionId.
      await upsertSaleFromSubscription(prisma, updated)

      revalidatePath("/subscriptions")
      revalidatePath(`/profile/${session.user.id}/memorialized`)
      return { effect: "upgraded" }
    }

    // Downgrade: schedule the switch for end of current period.
    const schedule = await stripe.subscriptionSchedules.create({
      from_subscription: active.stripeSubscriptionId,
    })
    const currentPhase = schedule.phases[0]
    if (!currentPhase) return { error: "Could not read current schedule phase." }

    await stripe.subscriptionSchedules.update(schedule.id, {
      end_behavior: "release",
      phases: [
        {
          items:      currentPhase.items.map((it) => ({
            price:    typeof it.price === "string" ? it.price : it.price.id,
            quantity: it.quantity ?? 1,
          })),
          start_date: currentPhase.start_date,
          end_date:   currentPhase.end_date ?? undefined,
          metadata:   currentPhase.metadata ?? undefined,
        },
        {
          items:    [{ price: targetPriceId, quantity: 1 }],
          metadata,
        },
      ],
    })

    revalidatePath("/subscriptions")
    return { effect: "scheduled" }
  } catch (err) {
    console.error("[billing] changeSubscription failed", err)
    return { error: (err as Error).message ?? "Could not switch plan." }
  }
}

export async function createPortalSession(): Promise<ActionResult<{ url: string }>> {
  const session    = await verifySession()
  const customerId = await ensureStripeCustomer(session.user.id)
  const appUrl     = process.env.APP_URL ?? "http://localhost:3000"

  const portal = await stripe.billingPortal.sessions.create({
    customer:   customerId,
    return_url: `${appUrl}/subscriptions`,
  })
  return { url: portal.url }
}
