import { NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { upsertSaleFromSubscription } from "@/lib/billing"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

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

  try {
    // Idempotency + atomicity: the StripeEvent PK insert and the sale upsert run
    // in one transaction. A duplicate delivery throws P2002 (caught below); if the
    // upsert fails, the StripeEvent row rolls back too, so Stripe's retry can
    // reprocess the event instead of it being permanently marked as "seen".
    await prisma.$transaction(async (tx) => {
      await tx.stripeEvent.create({ data: { id: event.id, type: event.type } })
      await upsertSaleFromSubscription(tx, event.data.object as Stripe.Subscription)
    })
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({ received: true, duplicate: true })
    }
    console.error("[stripe-webhook] processing failed", err)
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
