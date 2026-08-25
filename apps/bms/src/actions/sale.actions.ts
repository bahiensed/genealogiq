'use server'

import { revalidatePath } from 'next/cache'
import { getLocale, getTranslations } from 'next-intl/server'
import { Prisma } from '@genealogiq/db'
import { done, fail, currencyForLocale, currencyCode, type AppCurrency, type ActionResult } from '@genealogiq/core'
import { prisma } from '@/lib/prisma'
import { verifyAdmin, requireRole } from '@/lib/dal'
import { getSaleSchema, type SaleFormValues } from '@/schemas/sale.schema'
import { identityTranslator } from '@/schemas/i18n'
import { stripe } from '@/lib/stripe'
import { ensureTenantStripeCustomer } from '@genealogiq/services/stripe-customer'
import { sendSalePaymentLinkEmail } from '@/lib/email'
import { BMS_ORIGIN, settleSaleManually } from '@/lib/billing'

/** Stripe's ceiling for a Checkout Session is 30 days; a week is long enough to chase. */
const LINK_TTL_DAYS = 7

const PRICE_ID_BY_CURRENCY = {
  usd: 'stripePriceIdUsd',
  brl: 'stripePriceIdBrl',
  mxn: 'stripePriceIdMxn',
} as const

const PRICE_BY_CURRENCY = {
  usd: 'priceUsd',
  brl: 'priceBrl',
  mxn: 'priceMxn',
} as const

/**
 * Opens a Checkout Session for an existing sale row and emails the tenant.
 *
 * Shared by the two ways a link comes into being — a new sale and a resend —
 * so the second can never drift from the first on the things that matter:
 * which coupon applies, what the email says, how long the link lives.
 *
 * Throws rather than returning a result: both callers already own the decision
 * about what to do with a failure, and they do opposite things (delete the sale
 * vs. leave it alone).
 */
async function openCheckoutForSale(
  saleId:   number,
  currency: AppCurrency,
): Promise<{ url: string; email: string }> {
  const sale = await prisma.sale.findUnique({
    where:  { id: saleId },
    select: {
      quantity: true, tenantId: true, packageId: true, discountCouponId: true, soldById: true,
      package: { select: {
        name: true,
        priceUsd: true, priceBrl: true, priceMxn: true,
        stripePriceIdUsd: true, stripePriceIdBrl: true, stripePriceIdMxn: true,
      } },
      tenant:  { select: { email: true, name: true, tradeName: true } },
    },
  })
  if (!sale) throw new Error(`Sale ${saleId} not found`)

  const priceId = sale.package[PRICE_ID_BY_CURRENCY[currency]]
  const price   = sale.package[PRICE_BY_CURRENCY[currency]]
  if (!priceId) throw new Error(`Package ${sale.packageId} has no ${currency} price synced`)

  // Re-resolved on every open, not carried over: a coupon valid when the first
  // link was sent can be expired by the time someone asks for a second one.
  let promotionCodeId: string | null = null
  if (sale.discountCouponId) {
    const coupon = await prisma.discountCoupon.findFirst({
      where:  { id: sale.discountCouponId, isActive: true, stripePromotionCodeId: { not: null },
                OR: [{ redeemBy: null }, { redeemBy: { gt: new Date() } }] },
      select: { stripePromotionCodeId: true },
    })
    promotionCodeId = coupon?.stripePromotionCodeId ?? null
  }

  const customer  = await ensureTenantStripeCustomer(sale.tenantId)
  const baseUrl   = process.env.BMS_URL ?? 'http://localhost:3000'
  const expiresAt = new Date(Date.now() + LINK_TTL_DAYS * 24 * 60 * 60 * 1000)

  const metadata = {
    origin:    BMS_ORIGIN,
    saleId:    String(saleId),
    tenantId:  sale.tenantId,
    packageId: sale.packageId,
    quantity:  String(sale.quantity),
    soldById:  sale.soldById,
  }

  const checkout = await stripe.checkout.sessions.create({
    mode:                'payment',
    customer,
    line_items:          [{ price: priceId, quantity: sale.quantity }],
    client_reference_id: sale.tenantId,
    metadata,
    payment_intent_data: { metadata },
    expires_at:          Math.floor(expiresAt.getTime() / 1000),
    success_url:         `${baseUrl}/sales/manual-sales?status=success`,
    cancel_url:          `${baseUrl}/sales/manual-sales?status=cancel`,
    // Mutually exclusive in the Stripe API: sending both is a 400. A coupon the
    // operator chose is applied for the buyer; with none, the buyer may type
    // their own on Stripe's page.
    ...(promotionCodeId
      ? { discounts: [{ promotion_code: promotionCodeId }] }
      : { allow_promotion_codes: true }),
  })

  if (!checkout.url) throw new Error('Stripe returned a session with no URL')

  await prisma.sale.update({
    where: { id: saleId },
    data: {
      stripeSessionId: checkout.id,
      checkoutUrl:     checkout.url,
      amountSubtotal:  checkout.amount_subtotal,
      amountTotal:     checkout.amount_total,
      currency:        checkout.currency,
      // A fresh link revives the row: whatever killed the last one no longer applies.
      expiredAt:       null,
      failedAt:        null,
    },
  })

  await sendSalePaymentLinkEmail({
    to:          sale.tenant.email,
    url:         checkout.url,
    tenantName:  sale.tenant.tradeName || sale.tenant.name,
    productName: sale.package.name,
    quantity:    sale.quantity,
    amount:      formatAmount(checkout.amount_total, checkout.currency, price, sale.quantity),
    expiresAt,
  })

  return { url: checkout.url, email: sale.tenant.email }
}

/**
 * Opens a Stripe Checkout Session for a B2B order and emails the tenant the link.
 *
 * The sale is written BEFORE the session exists, deliberately: it is the row the
 * webhook later finds by session id, and it is what puts the order on the list as
 * "awaiting payment" the moment the operator hits the button. No GenCode is minted
 * here — codes are what payment buys, and a link nobody pays must leave nothing
 * behind.
 *
 * The currency comes from the locale the operator is working in, not from a field
 * they fill: a sale made in Portuguese charges in reais, in English dollars.
 */
export async function createSalePaymentLink(data: SaleFormValues): Promise<ActionResult> {
  const session = await verifyAdmin()
  const t = await getTranslations('Actions')
  const currency = currencyForLocale(await getLocale())

  const validated = getSaleSchema(identityTranslator).safeParse(data)
  if (!validated.success) return fail(t('common.invalidData'))

  const { packageId, tenantId, quantity, discountCouponId } = validated.data

  const pkg = await prisma.package.findUnique({
    where:  { id: packageId },
    select: { isActive: true, stripePriceIdUsd: true, stripePriceIdBrl: true, stripePriceIdMxn: true },
  })
  if (!pkg) return fail(t('sale.packageNotFound'))
  if (!pkg.isActive) return fail(t('sale.packageInactive'))
  // The synced-price guard is now per currency: a product priced only in dollars
  // is simply not sellable from the Portuguese interface.
  if (!pkg[PRICE_ID_BY_CURRENCY[currency]]) {
    return fail(t('sale.packageNotSyncedInCurrency', { currency: currencyCode(currency) }))
  }

  const tenant = await prisma.tenant.findUnique({
    where:  { id: tenantId },
    select: { isActive: true },
  })
  if (!tenant) return fail(t('sale.tenantNotFound'))
  if (!tenant.isActive) return fail(t('sale.tenantInactive'))

  // Re-resolve the coupon server-side. The select is a convenience, not an
  // authority: a stale page could offer one that has since expired.
  if (discountCouponId) {
    const coupon = await prisma.discountCoupon.findFirst({
      where: {
        id:                    discountCouponId,
        isActive:              true,
        stripePromotionCodeId: { not: null },
        OR: [{ redeemBy: null }, { redeemBy: { gt: new Date() } }],
        AND: [{ OR: [{ appliesTo: { none: {} } }, { appliesTo: { some: { id: packageId } } }] }],
      },
      select: { id: true },
    })
    if (!coupon) return fail(t('sale.couponNotApplicable'))
  }

  const sale = await prisma.sale.create({
    data: {
      packageId,
      tenantId,
      quantity,
      soldById: session.user!.id,
      discountCouponId: discountCouponId || null,
    },
    select: { id: true },
  })

  let email: string
  try {
    ;({ email } = await openCheckoutForSale(sale.id, currency))
  } catch (e) {
    // The sale only means something as the counterpart of a live session. With
    // no link it is an order nobody can pay and nobody can see the state of, so
    // it goes rather than lingering as a permanent "awaiting payment".
    await prisma.sale.delete({ where: { id: sale.id } }).catch(() => {})
    const message = e instanceof Error ? e.message : t('sale.unknownError')
    return fail(t('sale.linkFailed', { message }))
  }

  revalidatePath('/sales/manual-sales')
  return done(t('sale.linkSent', { email }))
}

/**
 * Sends the customer a link that works — whatever state the last one was in.
 *
 * One action rather than two, because "resend" and "regenerate" are the same
 * intent from the operator's side: the customer has not paid and should be
 * chased. Splitting them would force the operator to know whether the link is
 * still alive before choosing a button, which is exactly what they should not
 * have to think about.
 *
 * A live link is re-sent unchanged — no second session, no risk of two live
 * links for one order. A dead one is replaced, and the old session is expired
 * in Stripe first: an unexpired link forgotten in an old email could otherwise
 * be paid after the replacement already was, charging the customer twice.
 */
export async function resendSaleCharge(id: number): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')
  const currency = currencyForLocale(await getLocale())

  const sale = await prisma.sale.findUnique({
    where:  { id },
    select: { paidAt: true, reversedAt: true, expiredAt: true, failedAt: true,
              stripeSessionId: true, checkoutUrl: true, tenant: { select: { email: true } } },
  })
  if (!sale) return fail(t('sale.notFound'))
  if (sale.reversedAt) return fail(t('sale.alreadyReversed'))
  if (sale.paidAt) return fail(t('sale.alreadyPaid'))

  const linkIsDead = !!sale.expiredAt || !!sale.failedAt || !sale.checkoutUrl

  try {
    if (!linkIsDead) {
      await sendSaleLinkAgain(id)
      revalidatePath('/sales/manual-sales')
      return done(t('sale.linkResent', { email: sale.tenant.email }))
    }

    if (sale.stripeSessionId) {
      // Best-effort: an already-expired session throws, and that is fine.
      await stripe.checkout.sessions.expire(sale.stripeSessionId).catch(() => {})
    }
    const { email } = await openCheckoutForSale(id, currency)
    revalidatePath('/sales/manual-sales')
    return done(t('sale.linkRegenerated', { email }))
  } catch (e) {
    const message = e instanceof Error ? e.message : t('sale.unknownError')
    return fail(t('sale.linkFailed', { message }))
  }
}

/** Re-sends the existing link without touching Stripe. */
async function sendSaleLinkAgain(saleId: number): Promise<void> {
  const sale = await prisma.sale.findUnique({
    where:  { id: saleId },
    select: {
      quantity: true, checkoutUrl: true, amountTotal: true, currency: true,
      package: { select: { name: true } },
      tenant:  { select: { email: true, name: true, tradeName: true } },
    },
  })
  if (!sale?.checkoutUrl) throw new Error(`Sale ${saleId} has no live link`)

  await sendSalePaymentLinkEmail({
    to:          sale.tenant.email,
    url:         sale.checkoutUrl,
    tenantName:  sale.tenant.tradeName || sale.tenant.name,
    productName: sale.package.name,
    quantity:    sale.quantity,
    amount:      formatAmount(sale.amountTotal, sale.currency, null, sale.quantity),
    expiresAt:   new Date(Date.now() + LINK_TTL_DAYS * 24 * 60 * 60 * 1000),
  })
}

/**
 * Falls back to quantity x price only when Stripe reports no total — which it
 * does for a session whose amount depends on what the buyer picks on the page.
 */
function formatAmount(
  amountTotal: number | null,
  currency:    string | null,
  unitPrice:   Prisma.Decimal | null,
  quantity:    number,
): string {
  const value = amountTotal !== null
    ? amountTotal / 100
    : unitPrice !== null ? Number(unitPrice) * quantity : 0
  return new Intl.NumberFormat('pt-BR', {
    style:    'currency',
    currency: (currency ?? 'usd').toUpperCase(),
  }).format(value)
}

/**
 * Records a sale paid outside Stripe — a transfer, a PIX, a deposit.
 *
 * The escape hatch for the case the old flow was built entirely around: before
 * payment links, EVERY sale was recorded on the operator's word that money had
 * arrived. That is now the exception rather than the rule, and unlike before it
 * leaves a trace — paidById records who vouched for it, and a sale Stripe
 * settled leaves that column null.
 *
 * Narrower than verifyAdmin: an ADMIN can generate links all day, but asserting
 * that money arrived when Stripe never saw it is an owner's call.
 */
export async function markSalePaidManually(id: number): Promise<ActionResult> {
  // requireRole, not verifyAdmin: ADMIN may generate links all day, but
  // asserting money arrived when Stripe never saw it is an owner's call. It
  // 403s rather than returning a failure, which is right — the row action is
  // only rendered for those two roles, so reaching here means a forged request.
  const session = await requireRole('SUPER_ADMIN', 'OWNER')
  const t = await getTranslations('Actions')

  const sale = await prisma.sale.findUnique({
    where:  { id },
    select: { paidAt: true, reversedAt: true },
  })
  if (!sale) return fail(t('sale.notFound'))
  if (sale.reversedAt) return fail(t('sale.alreadyReversed'))
  if (sale.paidAt) return fail(t('sale.alreadyPaid'))

  await settleSaleManually(id, session.user!.id)

  revalidatePath('/sales/manual-sales')
  revalidatePath('/gencodes')
  return done(t('sale.markedPaid'))
}

export async function reverseSale(id: number): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const sale = await prisma.sale.findUnique({
    where:  { id },
    select: {
      quantity:   true,
      tenantId:   true,
      reversedAt: true,
      package:    { select: { quantity: true } },
    },
  })
  if (!sale) return fail(t('sale.notFound'))
  if (sale.reversedAt) return fail(t('sale.alreadyReversed'))

  try {
    await prisma.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id },
        data:  { reversedAt: new Date() },
      })

      // Delete only AVAILABLE licenses. SOLD ones were written off by the
      // tenant and ACTIVATED ones are linked to a memorial — reversing the B2B
      // sale must not reach into either.
      await tx.genCode.deleteMany({
        where: { saleId: id, status: 'AVAILABLE' },
      })
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return fail(t('sale.notFound'))
    }
    throw e
  }

  revalidatePath('/sales/manual-sales')
  revalidatePath('/gencodes')
  return done()
}
