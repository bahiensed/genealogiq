import { NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { applyCheckoutSession, type CheckoutContext } from "@/lib/billing"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Only checkout-session events for the QR Package one-time flow. Subscription
// events are handled by the APP webhook on a separate endpoint.
const RELEVANT_EVENTS = new Set<Stripe.Event["type"]>([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
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
    // Idempotency: stripe_events.id is the PK. A duplicate delivery throws P2002.
    await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } })
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({ received: true, duplicate: true })
    }
    console.error("[seq-stripe-webhook] stripeEvent insert failed", err)
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }

  const session = event.data.object as Stripe.Checkout.Session

  // Only one-time payment checkouts produced by createPackageCheckoutSession.
  if (session.mode !== "payment") {
    return NextResponse.json({ received: true, ignored: "non-payment mode" })
  }
  if (session.payment_status !== "paid") {
    // checkout.session.completed for ACH/async fires before payment settles;
    // ignore here and wait for async_payment_succeeded.
    return NextResponse.json({ received: true, ignored: "unpaid" })
  }

  const meta = session.metadata ?? {}
  const ctx: Partial<CheckoutContext> = {
    tenantId:  meta.tenantId,
    packageId: meta.packageId,
    quantity:  meta.quantity ? Number(meta.quantity) : undefined,
    soldById:  meta.soldById,
  }
  if (!ctx.tenantId || !ctx.packageId || !ctx.soldById || !ctx.quantity || !Number.isInteger(ctx.quantity)) {
    console.error("[seq-stripe-webhook] missing/invalid metadata", { sessionId: session.id, meta })
    return NextResponse.json({ received: true, ignored: "bad metadata" })
  }

  try {
    await applyCheckoutSession(session, ctx as CheckoutContext)
  } catch (err: unknown) {
    console.error("[seq-stripe-webhook] applyCheckoutSession failed", err)
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
