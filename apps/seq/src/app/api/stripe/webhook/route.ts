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
    // Log the detail server-side; don't echo verifier internals to the caller.
    console.error("Stripe webhook signature verification failed:", (err as Error).message)
    return new NextResponse("Invalid signature", { status: 400 })
  }

  if (!RELEVANT_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true })
  }

  const session = event.data.object as Stripe.Checkout.Session

  // Stripe fans every subscribed event out to EVERY endpoint on the account, so
  // this route also receives the sessions BMS opens for its payment-link sales.
  // Those arrive with a Sale row that already exists, carrying the session id —
  // applyCheckoutSession would hit the stripeSessionId unique, read it as
  // "already processed" and return without minting a single GenCode. BMS owns
  // its own endpoint and its own fulfilment; leave them alone.
  if ((session.metadata ?? {}).origin === "bms") {
    return NextResponse.json({ received: true, ignored: "bms-owned session" })
  }

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

  // Fast-path idempotency: skip events we've already fully processed.
  const seen = await prisma.stripeEvent.findUnique({ where: { id: event.id }, select: { id: true } })
  if (seen) return NextResponse.json({ received: true, duplicate: true })

  try {
    // Process FIRST (idempotent via Sale.stripeSessionId unique), then record the
    // event. Recording only after a successful apply means a failed apply leaves
    // no StripeEvent row, so Stripe's retry reprocesses it instead of being
    // skipped as a duplicate — closing the "event seen but sale missing" gap.
    await applyCheckoutSession(session, ctx as CheckoutContext)
    await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } }).catch((err: unknown) => {
      // A concurrent delivery may have recorded it first — harmless, since the
      // apply above is idempotent. Re-throw anything that isn't a unique-violation.
      if ((err as { code?: string }).code !== "P2002") throw err
    })
  } catch (err: unknown) {
    console.error("[seq-stripe-webhook] applyCheckoutSession failed", err)
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
