'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { Prisma } from '@genealogiq/db'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { done, fail, type ActionResult } from '@genealogiq/core'
import { verifyAdmin } from '@/lib/dal'
import { getPackageSchema, type PackageFormValues } from '@/schemas/package.schema'
import { identityTranslator } from '@/schemas/i18n'

const CURRENCIES = [
  { key: 'usd', price: 'priceUsd', monthly: 'monthlyPriceUsd', annualId: 'stripeAnnualPriceIdUsd', monthlyId: 'stripeMonthlyPriceIdUsd' },
  { key: 'brl', price: 'priceBrl', monthly: 'monthlyPriceBrl', annualId: 'stripeAnnualPriceIdBrl', monthlyId: 'stripeMonthlyPriceIdBrl' },
  { key: 'mxn', price: 'priceMxn', monthly: 'monthlyPriceMxn', annualId: 'stripeAnnualPriceIdMxn', monthlyId: 'stripeMonthlyPriceIdMxn' },
] as const

/** Zero in the form means "not priced in this currency"; the column holds null. */
function toDecimal(value: number): Prisma.Decimal | null {
  return value > 0 ? new Prisma.Decimal(value) : null
}

export async function createPackage(data: PackageFormValues): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const validated = getPackageSchema(identityTranslator).safeParse(data)
  if (!validated.success) return fail(t('common.invalidData'))

  const { priceUsd, priceBrl, priceMxn, monthlyPriceUsd, monthlyPriceBrl, monthlyPriceMxn, ...rest } = validated.data

  await prisma.package.create({
    data: {
      ...rest,
      priceUsd:        toDecimal(priceUsd),
      monthlyPriceUsd: toDecimal(monthlyPriceUsd),
      priceBrl:        toDecimal(priceBrl),
      monthlyPriceBrl: toDecimal(monthlyPriceBrl),
      priceMxn:        toDecimal(priceMxn),
      monthlyPriceMxn: toDecimal(monthlyPriceMxn),
    },
  })

  revalidatePath('/gencodes')
  return done(t('package.created'))
}

export async function updatePackage(id: string, data: PackageFormValues): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const validated = getPackageSchema(identityTranslator).safeParse(data)
  if (!validated.success) return fail(t('common.invalidData'))

  const { priceUsd, priceBrl, priceMxn, monthlyPriceUsd, monthlyPriceBrl, monthlyPriceMxn, ...rest } = validated.data
  const next = {
    priceUsd:        toDecimal(priceUsd),
    monthlyPriceUsd: toDecimal(monthlyPriceUsd),
    priceBrl:        toDecimal(priceBrl),
    monthlyPriceBrl: toDecimal(monthlyPriceBrl),
    priceMxn:        toDecimal(priceMxn),
    monthlyPriceMxn: toDecimal(monthlyPriceMxn),
  }

  const current = await prisma.package.findUnique({
    where:  { id },
    select: {
      termLength: true,
      priceUsd: true, monthlyPriceUsd: true, priceBrl: true, monthlyPriceBrl: true, priceMxn: true, monthlyPriceMxn: true,
      stripeAnnualPriceIdUsd: true, stripeMonthlyPriceIdUsd: true,
      stripeAnnualPriceIdBrl: true, stripeMonthlyPriceIdBrl: true,
      stripeAnnualPriceIdMxn: true, stripeMonthlyPriceIdMxn: true,
    },
  })
  if (!current) return fail(t('package.notFound'))

  // Stripe Prices are immutable, so a changed price means the synced Price id is
  // stale and must be dropped — syncPackageWithStripe mints a fresh one, and
  // until it does, that currency is not sellable. Per currency now: editing the
  // real price must not unsync the dollar one. stripeProductId is left alone and
  // reused, since Products ARE mutable.
  const changed = (before: Prisma.Decimal | null, after: Prisma.Decimal | null) =>
    before === null ? after !== null : after === null ? true : !before.equals(after)

  // termLength is the annual Price's interval_count, so changing it invalidates
  // every currency's annual Price at once — not just the ones whose amount moved.
  const termChanged = current.termLength !== rest.termLength

  const cleared: Record<string, null> = {}
  const stale:   string[] = []
  for (const c of CURRENCIES) {
    if ((termChanged || changed(current[c.price], next[c.price])) && current[c.annualId]) {
      cleared[c.annualId] = null
      stale.push(current[c.annualId]!)
    }
    // The monthly Price does NOT depend on termLength — its interval_count is
    // always 1 — so only its own amount can invalidate it.
    if (changed(current[c.monthly], next[c.monthly]) && current[c.monthlyId]) {
      cleared[c.monthlyId] = null
      stale.push(current[c.monthlyId]!)
    }
  }

  try {
    await prisma.package.update({
      where: { id },
      data:  { ...rest, ...next, ...cleared },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return fail(t('package.notFound'))
    }
    throw e
  }

  // Best-effort: archive the superseded Stripe Prices so they stop being
  // live/purchasable once orphaned from the DB. Never blocks the save.
  for (const id of stale) {
    await stripe.prices.update(id, { active: false }).catch(() => {})
  }

  revalidatePath('/gencodes')
  return done(stale.length > 0 ? t('package.updatedStripeCleared') : t('package.updated'))
}

export async function deletePackage(id: string): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  try {
    await prisma.package.delete({ where: { id } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return fail(t('package.notFound'))
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
      return fail(t('package.hasSales'))
    }
    throw e
  }

  revalidatePath('/gencodes')
  return done()
}

export async function togglePackageActive(id: string): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const pkg = await prisma.package.findUnique({ where: { id }, select: { isActive: true } })
  if (!pkg) return fail(t('package.notFound'))

  await prisma.package.update({ where: { id }, data: { isActive: !pkg.isActive } })
  revalidatePath('/gencodes')
  return done()
}

/**
 * Ensures both Stripe Prices exist for one currency, creating whichever is
 * missing. A currency with no annual price is skipped entirely and its existing
 * ids preserved — a product live in dollars and unpriced in pesos is normal,
 * not an error.
 *
 * Neither cadence uses Stripe's `interval: 'year'`, deliberately: termLength is
 * a count of months, so a 6- or 18-month product works through the same path
 * with no special case. Annual bills every `termLength` months; monthly every 1.
 *
 * Prices are immutable in Stripe, so an existing id is reused untouched —
 * updatePackage is what clears an id when the number behind it changes.
 */
async function ensureCadencePrices(
  productId:  string,
  name:       string,
  currency:   'usd' | 'brl' | 'mxn',
  annual:     Prisma.Decimal | null,
  monthly:    Prisma.Decimal | null,
  termLength: number,
  existingAnnualId:  string | null,
  existingMonthlyId: string | null,
): Promise<{ annualId: string | null; monthlyId: string | null }> {
  if (annual === null || Number(annual) <= 0) {
    return { annualId: existingAnnualId, monthlyId: existingMonthlyId }
  }

  let annualId = existingAnnualId
  if (!annualId) {
    const created = await stripe.prices.create({
      product:     productId,
      unit_amount: Math.round(Number(annual) * 100),
      currency,
      recurring:   { interval: 'month', interval_count: termLength },
      nickname:    `${name} annual ${currency}`,
    })
    annualId = created.id
  }

  // Unlike Subscription, a missing monthly amount means "not offered" rather
  // than "derive it": paying in instalments is a commercial choice per product,
  // and 29.90 x 12 against 299.00 is exactly the point — there is no sensible
  // number to derive.
  let monthlyId = existingMonthlyId
  if (!monthlyId && monthly !== null && Number(monthly) > 0) {
    const created = await stripe.prices.create({
      product:     productId,
      unit_amount: Math.round(Number(monthly) * 100),
      currency,
      recurring:   { interval: 'month', interval_count: 1 },
      nickname:    `${name} monthly ${currency}`,
    })
    monthlyId = created.id
  }

  return { annualId, monthlyId }
}

/**
 * Pushes the saved product to Stripe: one Product, and up to two Prices per
 * currency — annual and monthly.
 */
export async function syncPackageWithStripe(id: string): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const pkg = await prisma.package.findUnique({
    where:  { id },
    select: {
      id: true, name: true, description: true, quantity: true, termLength: true, stripeProductId: true,
      priceUsd: true, monthlyPriceUsd: true, stripeAnnualPriceIdUsd: true, stripeMonthlyPriceIdUsd: true,
      priceBrl: true, monthlyPriceBrl: true, stripeAnnualPriceIdBrl: true, stripeMonthlyPriceIdBrl: true,
      priceMxn: true, monthlyPriceMxn: true, stripeAnnualPriceIdMxn: true, stripeMonthlyPriceIdMxn: true,
    },
  })
  if (!pkg) return fail(t('package.notFound'))

  if (CURRENCIES.every((c) => !pkg[c.price] || Number(pkg[c.price]) <= 0)) {
    return fail(t('package.priceRequired'))
  }
  // termLength is every annual Price's interval_count; zero has no meaning here.
  if (pkg.termLength <= 0) return fail(t('package.termLengthRequired'))

  try {
    let productId = pkg.stripeProductId
    if (productId) {
      await stripe.products.update(productId, {
        name:        pkg.name,
        description: pkg.description ?? undefined,
      })
    } else {
      const product = await stripe.products.create({
        name:        pkg.name,
        description: pkg.description ?? undefined,
        metadata:    { packageId: pkg.id, unitsPerProduct: String(pkg.quantity) },
      })
      productId = product.id
    }

    const ids: Record<string, string | null> = {}
    for (const c of CURRENCIES) {
      const { annualId, monthlyId } = await ensureCadencePrices(
        productId, pkg.name, c.key,
        pkg[c.price], pkg[c.monthly], pkg.termLength,
        pkg[c.annualId], pkg[c.monthlyId],
      )
      ids[c.annualId]  = annualId
      ids[c.monthlyId] = monthlyId
    }

    await prisma.package.update({
      where: { id: pkg.id },
      data:  { stripeProductId: productId, ...ids },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : t('package.unknownError')
    return fail(t('package.stripeSyncFailed', { message }))
  }

  revalidatePath('/gencodes')
  return done(t('package.synced'))
}
