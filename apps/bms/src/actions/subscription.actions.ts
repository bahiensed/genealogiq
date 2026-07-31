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

export async function createSubscription(data: SubscriptionFormValues): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const validated = getSubscriptionSchema(identityTranslator).safeParse(data)
  if (!validated.success) return fail(t('common.invalidData'))

  const { price, ...rest } = validated.data
  await prisma.subscription.create({ data: { ...rest, price: new Prisma.Decimal(price) } })

  revalidatePath('/subscriptions')
  return done(t('subscription.created'))
}

export async function updateSubscription(id: string, data: SubscriptionFormValues): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const validated = getSubscriptionSchema(identityTranslator).safeParse(data)
  if (!validated.success) return fail(t('common.invalidData'))

  const { price, ...rest } = validated.data
  const newPrice = new Prisma.Decimal(price)

  const current = await prisma.subscription.findUnique({
    where:  { id },
    select: { price: true, termLength: true, stripeAnnualPriceId: true, stripeMonthlyPriceId: true },
  })
  if (!current) return fail(t('subscription.notFound'))

  // Stripe Prices are immutable. termLength feeds both Prices' math (the
  // annual Price's interval_count IS termLength; the monthly Price's amount
  // is price/termLength) — so either changing invalidates both, same as a
  // price change on Package. The Product ref is left alone: name/description
  // are updated in place by syncSubscriptionWithStripe, no immutability issue there.
  const priceChanged = !current.price.equals(newPrice)
  const termChanged = current.termLength !== rest.termLength
  const clearStripePrices = (priceChanged || termChanged) &&
    (!!current.stripeAnnualPriceId || !!current.stripeMonthlyPriceId)

  try {
    await prisma.subscription.update({
      where: { id },
      data:  {
        ...rest,
        price: newPrice,
        ...(clearStripePrices && { stripeAnnualPriceId: null, stripeMonthlyPriceId: null }),
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return fail(t('subscription.notFound'))
    }
    throw e
  }

  revalidatePath('/subscriptions')
  return done(clearStripePrices ? t('subscription.updatedStripeCleared') : t('subscription.updated'))
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

// Push the saved plan's data to Stripe: create/update the Product and, if
// missing, create the annual/monthly Prices. Mirrors apps/app/prisma/seed-stripe.ts
// but runs on demand from BMS. Stripe Prices are immutable — updateSubscription()
// clears the two Price ids on a price/termLength change, so fresh Prices are
// minted here on the next sync.
export async function syncSubscriptionWithStripe(id: string): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const plan = await prisma.subscription.findUnique({
    where:  { id },
    select: {
      id: true, code: true, name: true, description: true, price: true, termLength: true,
      stripeProductId: true, stripeAnnualPriceId: true, stripeMonthlyPriceId: true,
    },
  })
  if (!plan) return fail(t('subscription.notFound'))

  const priceCents = Math.round(Number(plan.price) * 100)
  if (priceCents <= 0) return fail(t('subscription.priceRequired'))
  // termLength feeds both Prices' math (annual interval_count, monthly
  // amount = price/termLength) — a 0 ("lifetime") plan isn't recurring and
  // can't be synced as-is.
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

    let annualPriceId = plan.stripeAnnualPriceId
    if (!annualPriceId) {
      const ap = await stripe.prices.create({
        product:     productId,
        unit_amount: priceCents,
        currency:    'usd',
        recurring:   { interval: 'month', interval_count: plan.termLength },
        nickname:    `${plan.code} annual`,
      })
      annualPriceId = ap.id
    }

    let monthlyPriceId = plan.stripeMonthlyPriceId
    if (!monthlyPriceId) {
      const monthlyPriceCents = Math.round((Number(plan.price) / plan.termLength) * 100)
      const mp = await stripe.prices.create({
        product:     productId,
        unit_amount: monthlyPriceCents,
        currency:    'usd',
        recurring:   { interval: 'month', interval_count: 1 },
        nickname:    `${plan.code} monthly`,
      })
      monthlyPriceId = mp.id
    }

    await prisma.subscription.update({
      where: { id: plan.id },
      data:  { stripeProductId: productId, stripeAnnualPriceId: annualPriceId, stripeMonthlyPriceId: monthlyPriceId },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : t('subscription.unknownError')
    return fail(t('subscription.stripeSyncFailed', { message }))
  }

  revalidatePath('/subscriptions')
  return done(t('subscription.synced'))
}
