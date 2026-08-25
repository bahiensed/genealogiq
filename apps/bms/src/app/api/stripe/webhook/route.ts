import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { applySalePayment, markSaleUnpayable, BMS_ORIGIN } from '@/lib/billing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Only the checkout lifecycle of a BMS payment-link sale. Subscription events
// belong to the APP endpoint; SEQ's self-serve package purchases to SEQ's.
//
// async_payment_failed is here even though SEQ omits it, and the asymmetry is
// the point: SEQ creates nothing until the money lands, so a bounced boleto
// leaves no row to correct. BMS writes the sale when the link is generated, so
// without this event a bounced boleto strands it in "awaiting payment" forever —
// and checkout.session.expired never comes to the rescue, because the session
// already completed and will never expire.
const RELEVANT_EVENTS = new Set<Stripe.Event['type']>([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'checkout.session.expired',
])

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')
  if (!signature) return new NextResponse('Missing signature', { status: 400 })

  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error('[bms-stripe-webhook] STRIPE_WEBHOOK_SECRET is not set')
    return new NextResponse('Server misconfigured', { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, secret)
  } catch (err) {
    // Log the detail server-side; don't echo verifier internals to the caller.
    console.error('Stripe webhook signature verification failed:', (err as Error).message)
    return new NextResponse('Invalid signature', { status: 400 })
  }

  if (!RELEVANT_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true })
  }

  const session = event.data.object as Stripe.Checkout.Session

  // Stripe fans every subscribed event out to EVERY endpoint on the account, so
  // this route also sees SEQ's and APP's sessions. Ours are the ones we stamped.
  if ((session.metadata ?? {}).origin !== BMS_ORIGIN) {
    return NextResponse.json({ received: true, ignored: 'not a bms session' })
  }

  // A dead link needs no ledger entry: marking it is idempotent on its own, and
  // recording the event would only make a later genuine payment on a retried
  // session look like a duplicate.
  if (event.type === 'checkout.session.expired') {
    await markSaleUnpayable(session.id, 'expired')
    return NextResponse.json({ received: true })
  }
  if (event.type === 'checkout.session.async_payment_failed') {
    await markSaleUnpayable(session.id, 'failed')
    return NextResponse.json({ received: true })
  }

  if (session.payment_status !== 'paid') {
    // checkout.session.completed fires before an async payment (boleto, Pix,
    // ACH) settles; wait for async_payment_succeeded.
    return NextResponse.json({ received: true, ignored: 'unpaid' })
  }

  // Fast-path idempotency: skip events already fully processed.
  const seen = await prisma.stripeEvent.findUnique({ where: { id: event.id }, select: { id: true } })
  if (seen) return NextResponse.json({ received: true, duplicate: true })

  try {
    // Process FIRST, then record — the same order SEQ uses for one-time
    // payments. applySalePayment is idempotent on Sale.paidAt, so a retry after
    // a crash between the two settles nothing twice.
    await applySalePayment(session)
    await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } }).catch((err: unknown) => {
      if ((err as { code?: string }).code !== 'P2002') throw err
    })
  } catch (err: unknown) {
    console.error('[bms-stripe-webhook] applySalePayment failed', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
