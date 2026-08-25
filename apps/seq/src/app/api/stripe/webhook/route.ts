import { NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { applyGenCodeSubscription, CHECKOUT_ORIGINS } from "@genealogiq/services/gencode-fulfilment"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GenCode packages are sold as subscriptions in both cadences, so the sale's
// state comes from these events. Consumer subscription plans belong to the APP
// endpoint, and BMS's payment-link sales to BMS's — the origin marker on the
// metadata is what separates the three, since Stripe delivers every subscribed
// event to every endpoint on the account.
const RELEVANT_EVENTS = new Set<Stripe.Event["type"]>([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
])

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature")
  if (!signature) return new NextResponse("Missing signature", { status: 400 })

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) return new NextResponse("Webhook secret not configured", { status: 500 })

  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    // Log the detail server-side; don't echo verifier internals to the caller.
    console.error("Stripe webhook signature verification failed:", (err as Error).message)
    return new NextResponse("Invalid signature", { status: 400 })
  }

  if (!RELEVANT_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true })
  }

  const sub = event.data.object as Stripe.Subscription
  if ((sub.metadata ?? {}).origin !== CHECKOUT_ORIGINS.seq) {
    return NextResponse.json({ received: true, ignored: "not a seq subscription" })
  }

  try {
    // Ledger and apply in ONE transaction: a duplicate delivery hits the PK, and
    // a failed apply rolls the ledger row back so Stripe's retry can reprocess.
    await prisma.$transaction(async (tx) => {
      await tx.stripeEvent.create({ data: { id: event.id, type: event.type } })
      // No post-payment step here, unlike BMS: a tenant buying inside Sequoia is
      // already signed in, so there is no access to grant.
      await applyGenCodeSubscription(sub, CHECKOUT_ORIGINS.seq)
    })
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({ received: true, duplicate: true })
    }
    console.error("[seq-stripe-webhook] applyGenCodeSubscription failed", err)
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
