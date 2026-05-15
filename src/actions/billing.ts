"use server"

import { verifySession } from "@/lib/dal"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { ensureStripeCustomer } from "@/lib/billing"

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
    success_url:           `${appUrl}/plans?status=success`,
    cancel_url:            `${appUrl}/plans?status=cancel`,
    allow_promotion_codes: true,
  })

  if (!checkout.url) return { error: "Stripe did not return a checkout URL." }
  return { url: checkout.url }
}

export async function createPortalSession(): Promise<ActionResult<{ url: string }>> {
  const session    = await verifySession()
  const customerId = await ensureStripeCustomer(session.user.id)
  const appUrl     = process.env.APP_URL ?? "http://localhost:3000"

  const portal = await stripe.billingPortal.sessions.create({
    customer:   customerId,
    return_url: `${appUrl}/plans`,
  })
  return { url: portal.url }
}
