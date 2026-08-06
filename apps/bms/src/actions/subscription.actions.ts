'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { Prisma } from '@genealogiq/db'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { done, fail, type ActionResult } from '@genealogiq/core'
import { verifyAdmin } from '@/lib/dal'
import { getSubscriptionSchema, type SubscriptionFormValues } from '@/schemas/subscription.schema'
import { identityTranslator } from '@/schemas/i18n'

function toDecimalOrNull(value: number): Prisma.Decimal | null {
  return value > 0 ? new Prisma.Decimal(value) : null
}

export async function createSubscription(data: SubscriptionFormValues): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const validated = getSubscriptionSchema(identityTranslator).safeParse(data)
  if (!validated.success) return fail(t('common.invalidData'))

  const { priceUsd, monthlyPriceUsd, priceBrl, monthlyPriceBrl, priceMxn, monthlyPriceMxn, ...rest } = validated.data
  await prisma.subscription.create({
    data: {
      ...rest,
      priceUsd:        new Prisma.Decimal(priceUsd),
      monthlyPriceUsd: toDecimalOrNull(monthlyPriceUsd),
      priceBrl:        toDecimalOrNull(priceBrl),
      monthlyPriceBrl: toDecimalOrNull(monthlyPriceBrl),
      priceMxn:        toDecimalOrNull(priceMxn),
      monthlyPriceMxn: toDecimalOrNull(monthlyPriceMxn),
    },
  })

  revalidatePath('/subscriptions')
  return done(t('subscription.created'))
}

// A currency's price+termLength changed → its 2 Stripe Price ids (immutable)
// must be cleared so syncSubscriptionWithStripe mints fresh ones. Each
// currency is independent: editing BRL must never invalidate USD/MXN.
function decimalChanged(current: Prisma.Decimal | null, next: Prisma.Decimal | null): boolean {
  if (current === null) return next !== null
  return next === null || !current.equals(next)
}

export async function updateSubscription(id: string, data: SubscriptionFormValues): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const validated = getSubscriptionSchema(identityTranslator).safeParse(data)
  if (!validated.success) return fail(t('common.invalidData'))

  const { priceUsd, monthlyPriceUsd, priceBrl, monthlyPriceBrl, priceMxn, monthlyPriceMxn, ...rest } = validated.data
  const newPrices = {
    priceUsd:        new Prisma.Decimal(priceUsd),
    monthlyPriceUsd: toDecimalOrNull(monthlyPriceUsd),
    priceBrl:        toDecimalOrNull(priceBrl),
    monthlyPriceBrl: toDecimalOrNull(monthlyPriceBrl),
    priceMxn:        toDecimalOrNull(priceMxn),
    monthlyPriceMxn: toDecimalOrNull(monthlyPriceMxn),
  }

  const current = await prisma.subscription.findUnique({
    where:  { id },
    select: {
      termLength: true,
      priceUsd: true, monthlyPriceUsd: true, stripeAnnualPriceIdUsd: true, stripeMonthlyPriceIdUsd: true,
      priceBrl: true, monthlyPriceBrl: true, stripeAnnualPriceIdBrl: true, stripeMonthlyPriceIdBrl: true,
      priceMxn: true, monthlyPriceMxn: true, stripeAnnualPriceIdMxn: true, stripeMonthlyPriceIdMxn: true,
    },
  })
  if (!current) return fail(t('subscription.notFound'))

  // termLength feeds every currency's annual Price math (interval_count) —
  // changing it invalidates all 3, on top of whichever currency's own price
  // also changed.
  const termChanged = current.termLength !== rest.termLength

  const currencyClears: { changed: boolean; hasStripeIds: boolean; clear: Record<string, null> }[] = [
    {
      changed: termChanged || decimalChanged(current.priceUsd, newPrices.priceUsd) || decimalChanged(current.monthlyPriceUsd, newPrices.monthlyPriceUsd),
      hasStripeIds: !!current.stripeAnnualPriceIdUsd || !!current.stripeMonthlyPriceIdUsd,
      clear: { stripeAnnualPriceIdUsd: null, stripeMonthlyPriceIdUsd: null },
    },
    {
      changed: termChanged || decimalChanged(current.priceBrl, newPrices.priceBrl) || decimalChanged(current.monthlyPriceBrl, newPrices.monthlyPriceBrl),
      hasStripeIds: !!current.stripeAnnualPriceIdBrl || !!current.stripeMonthlyPriceIdBrl,
      clear: { stripeAnnualPriceIdBrl: null, stripeMonthlyPriceIdBrl: null },
    },
    {
      changed: termChanged || decimalChanged(current.priceMxn, newPrices.priceMxn) || decimalChanged(current.monthlyPriceMxn, newPrices.monthlyPriceMxn),
      hasStripeIds: !!current.stripeAnnualPriceIdMxn || !!current.stripeMonthlyPriceIdMxn,
      clear: { stripeAnnualPriceIdMxn: null, stripeMonthlyPriceIdMxn: null },
    },
  ]

  let clearPatch: Record<string, null> = {}
  let clearedAny = false
  for (const c of currencyClears) {
    if (c.changed && c.hasStripeIds) {
      clearPatch = { ...clearPatch, ...c.clear }
      clearedAny = true
    }
  }

  try {
    await prisma.subscription.update({
      where: { id },
      data:  {
        ...rest,
        ...newPrices,
        ...clearPatch,
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return fail(t('subscription.notFound'))
    }
    throw e
  }

  revalidatePath('/subscriptions')
  return done(clearedAny ? t('subscription.updatedStripeCleared') : t('subscription.updated'))
}

export async function deleteSubscription(id: string): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  try {
    await prisma.subscription.delete({ where: { id } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2025') return fail(t('subscription.notFound'))
      if (e.code === 'P2003') return fail(t('subscription.hasSales'))
    }
    throw e
  }

  revalidatePath('/subscriptions')
  return done()
}

export async function toggleSubscriptionActive(id: string): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const subscription = await prisma.subscription.findUnique({ where: { id }, select: { isActive: true } })
  if (!subscription) return fail(t('subscription.notFound'))

  await prisma.subscription.update({ where: { id }, data: { isActive: !subscription.isActive } })
  revalidatePath('/subscriptions')
  return done()
}

// Ensures both Stripe Prices (annual + monthly) exist for one currency,
// creating whichever is missing. Skipped entirely if this currency isn't
// configured (price null/0) — a plan can be partially synced (e.g. USD live,
// BRL/MXN not set up yet) without failing the whole sync.
async function ensureCurrencyPrices(
  productId:    string,
  planCode:     string,
  currency:     'usd' | 'brl' | 'mxn',
  price:        Prisma.Decimal | null,
  monthlyPrice: Prisma.Decimal | null,
  termLength:   number,
  existingAnnualId:  string | null,
  existingMonthlyId: string | null,
): Promise<{ annualId: string | null; monthlyId: string | null }> {
  if (price === null || Number(price) <= 0) return { annualId: existingAnnualId, monthlyId: existingMonthlyId }

  let annualId = existingAnnualId
  if (!annualId) {
    const priceCents = Math.round(Number(price) * 100)
    const ap = await stripe.prices.create({
      product:     productId,
      unit_amount: priceCents,
      currency,
      recurring:   { interval: 'month', interval_count: termLength },
      nickname:    `${planCode} annual ${currency}`,
    })
    annualId = ap.id
  }

  let monthlyId = existingMonthlyId
  if (!monthlyId) {
    const monthlyPriceCents = monthlyPrice !== null
      ? Math.round(Number(monthlyPrice) * 100)
      : Math.round((Number(price) / termLength) * 100)
    const mp = await stripe.prices.create({
      product:     productId,
      unit_amount: monthlyPriceCents,
      currency,
      recurring:   { interval: 'month', interval_count: 1 },
      nickname:    `${planCode} monthly ${currency}`,
    })
    monthlyId = mp.id
  }

  return { annualId, monthlyId }
}

// Push the saved plan's data to Stripe: create/update the Product and, for
// each configured currency, create whichever annual/monthly Prices are
// missing. Mirrors apps/app/prisma/seed-stripe.ts (USD-only, superseded) but
// runs on demand from BMS, for all 3 currencies. Stripe Prices are
// immutable — updateSubscription() clears a currency's Price ids on a
// price/termLength change, so fresh Prices are minted here on the next sync.
export async function syncSubscriptionWithStripe(id: string): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const plan = await prisma.subscription.findUnique({
    where:  { id },
    select: {
      id: true, code: true, name: true, description: true, termLength: true,
      priceUsd: true, monthlyPriceUsd: true, stripeAnnualPriceIdUsd: true, stripeMonthlyPriceIdUsd: true,
      priceBrl: true, monthlyPriceBrl: true, stripeAnnualPriceIdBrl: true, stripeMonthlyPriceIdBrl: true,
      priceMxn: true, monthlyPriceMxn: true, stripeAnnualPriceIdMxn: true, stripeMonthlyPriceIdMxn: true,
      stripeProductId: true,
    },
  })
  if (!plan) return fail(t('subscription.notFound'))

  if (Number(plan.priceUsd) <= 0) return fail(t('subscription.priceRequired'))
  // termLength feeds every currency's annual Price math (interval_count) — a
  // 0 ("lifetime") plan isn't recurring and can't be synced as-is.
  if (plan.termLength <= 0) return fail(t('subscription.termLengthRequired'))

  try {
    let productId = plan.stripeProductId
    if (productId) {
      await stripe.products.update(productId, {
        name:        plan.name,
        description: plan.description ?? undefined,
      })
    } else {
      const product = await stripe.products.create({
        name:        plan.name,
        description: plan.description ?? undefined,
        metadata:    { subscriptionId: plan.id, code: plan.code },
      })
      productId = product.id
    }

    const usd = await ensureCurrencyPrices(productId, plan.code, 'usd', plan.priceUsd, plan.monthlyPriceUsd, plan.termLength, plan.stripeAnnualPriceIdUsd, plan.stripeMonthlyPriceIdUsd)
    const brl = await ensureCurrencyPrices(productId, plan.code, 'brl', plan.priceBrl, plan.monthlyPriceBrl, plan.termLength, plan.stripeAnnualPriceIdBrl, plan.stripeMonthlyPriceIdBrl)
    const mxn = await ensureCurrencyPrices(productId, plan.code, 'mxn', plan.priceMxn, plan.monthlyPriceMxn, plan.termLength, plan.stripeAnnualPriceIdMxn, plan.stripeMonthlyPriceIdMxn)

    await prisma.subscription.update({
      where: { id: plan.id },
      data: {
        stripeProductId:         productId,
        stripeAnnualPriceIdUsd:  usd.annualId,
        stripeMonthlyPriceIdUsd: usd.monthlyId,
        stripeAnnualPriceIdBrl:  brl.annualId,
        stripeMonthlyPriceIdBrl: brl.monthlyId,
        stripeAnnualPriceIdMxn:  mxn.annualId,
        stripeMonthlyPriceIdMxn: mxn.monthlyId,
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : t('subscription.unknownError')
    return fail(t('subscription.stripeSyncFailed', { message }))
  }

  revalidatePath('/subscriptions')
  return done(t('subscription.synced'))
}
