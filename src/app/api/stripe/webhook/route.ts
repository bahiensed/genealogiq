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
    return new NextResponse(`Bad signature: ${(err as Error).message}`, { status: 400 })
  }

  if (!RELEVANT_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true })
  }

  try {
    // Idempotency first: if the event.id already exists, this throws P2002 and we exit early.
    await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } })
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({ received: true, duplicate: true })
    }
    console.error("[stripe-webhook] stripeEvent insert failed", err)
    return NextResponse.json(
      { error: "stripeEvent insert failed", detail: (err as Error).message },
      { status: 500 },
    )
  }

  try {
    await upsertSaleFromSubscription(prisma, event.data.object as Stripe.Subscription)
  } catch (err: unknown) {
    console.error("[stripe-webhook] upsertSaleFromSubscription failed", err)
    return NextResponse.json(
      { error: "upsertSaleFromSubscription failed", detail: (err as Error).message },
      { status: 500 },
    )
  }

  return NextResponse.json({ received: true })
}
