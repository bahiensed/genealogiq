import { NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import {
  applyPartnerInvoicePaid,
  linkPartnerSubscription,
  syncPartnerSubscriptionStatus,
} from "@genealogiq/services/partner-billing"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// SEQ's half of the partner contract lifecycle. Identical to BMS's in
// everything that decides state, and deliberately so: a partner can subscribe
// from either app and the cycle they end up with must not depend on which.
//
// The one asymmetry is what BMS does afterwards — opening Sequoia to a partner
// who may never have signed in. A partner subscribing HERE is already signed in,
// so there is nothing to grant.
const RELEVANT_EVENTS = new Set<Stripe.Event["type"]>([
  "invoice.paid",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
])

function subscriptionIdOf(invoice: Stripe.Invoice): string | null {
  const raw = (invoice as unknown as { subscription?: string | { id: string } }).subscription
  if (typeof raw === "string") return raw
  return raw?.id ?? null
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature")
  if (!signature) return new NextResponse("Missing signature", { status: 400 })

  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error("[seq-stripe-webhook] STRIPE_WEBHOOK_SECRET is not set")
    return new NextResponse("Server misconfigured", { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, secret)
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", (err as Error).message)
    return new NextResponse("Invalid signature", { status: 400 })
  }

  if (!RELEVANT_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true })
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice
    const subId = subscriptionIdOf(invoice)
    if (!subId) return NextResponse.json({ received: true, ignored: "invoice without subscription" })

    try {
      const sub = await stripe.subscriptions.retrieve(subId)
      if (sub.metadata?.origin !== "seq" || !sub.metadata?.partnerSubscriptionId) {
        return NextResponse.json({ received: true, ignored: "not a seq partner subscription" })
      }
      await linkPartnerSubscription(sub)
      const applied = await applyPartnerInvoicePaid(invoice)
      return NextResponse.json({ received: true, outcome: applied.outcome })
    } catch (err) {
      console.error("[seq-stripe-webhook] applyPartnerInvoicePaid failed", err)
      return NextResponse.json({ error: "internal" }, { status: 500 })
    }
  }

  const sub = event.data.object as Stripe.Subscription
  if (sub.metadata?.origin !== "seq" || !sub.metadata?.partnerSubscriptionId) {
    return NextResponse.json({ received: true, ignored: "not a seq partner subscription" })
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.stripeEvent.create({ data: { id: event.id, type: event.type } })
      await linkPartnerSubscription(sub)
      await syncPartnerSubscriptionStatus(sub)
    })
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({ received: true, duplicate: true })
    }
    console.error("[seq-stripe-webhook] partner subscription sync failed", err)
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
