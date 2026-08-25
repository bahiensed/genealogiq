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
  { key: 'usd', price: 'priceUsd', id: 'stripePriceIdUsd' },
  { key: 'brl', price: 'priceBrl', id: 'stripePriceIdBrl' },
  { key: 'mxn', price: 'priceMxn', id: 'stripePriceIdMxn' },
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

  const { priceUsd, priceBrl, priceMxn, ...rest } = validated.data

  await prisma.package.create({
    data: {
      ...rest,
      priceUsd: toDecimal(priceUsd),
      priceBrl: toDecimal(priceBrl),
      priceMxn: toDecimal(priceMxn),
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

  const { priceUsd, priceBrl, priceMxn, ...rest } = validated.data
  const next = { priceUsd: toDecimal(priceUsd), priceBrl: toDecimal(priceBrl), priceMxn: toDecimal(priceMxn) }

  const current = await prisma.package.findUnique({
    where:  { id },
    select: {
      priceUsd: true, priceBrl: true, priceMxn: true,
      stripePriceIdUsd: true, stripePriceIdBrl: true, stripePriceIdMxn: true,
    },
  })
  if (!current) return fail(t('package.notFound'))

  // Stripe Prices are immutable, so a changed price means the synced Price id is
  // stale and must be dropped — syncPackageWithStripe mints a fresh one, and
  // until it does, that currency is not sellable. Per currency now: editing the
  // real price must not unsync the dollar one. stripeProductId is left alone and
  // reused, since Products ARE mutable.
  const cleared: Record<string, null> = {}
  const stale:   string[] = []
  for (const c of CURRENCIES) {
    const before = current[c.price]
    const after  = next[c.price]
    const changed = before === null ? after !== null
                  : after === null  ? true
                  : !before.equals(after)
    if (changed && current[c.id]) {
      cleared[c.id] = null
      stale.push(current[c.id]!)
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
 * Pushes the saved product to Stripe: one Product, and one Price per currency
 * that has one.
 *
 * A currency with no price is skipped rather than failing — a product sold only
 * in reais is a legitimate product. An existing Price id is reused untouched,
 * because Stripe Prices are immutable; updatePackage is what clears the id when
 * the number changes, and this mints the replacement.
 */
export async function syncPackageWithStripe(id: string): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const pkg = await prisma.package.findUnique({
    where:  { id },
    select: {
      id: true, name: true, description: true, quantity: true, stripeProductId: true,
      priceUsd: true, priceBrl: true, priceMxn: true,
      stripePriceIdUsd: true, stripePriceIdBrl: true, stripePriceIdMxn: true,
    },
  })
  if (!pkg) return fail(t('package.notFound'))

  if (CURRENCIES.every((c) => !pkg[c.price] || Number(pkg[c.price]) <= 0)) {
    return fail(t('package.priceRequired'))
  }

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

    const ids: Record<string, string> = {}
    for (const c of CURRENCIES) {
      const price = pkg[c.price]
      if (!price || Number(price) <= 0) continue
      if (pkg[c.id]) continue
      const created = await stripe.prices.create({
        product:     productId,
        unit_amount: Math.round(Number(price) * 100),
        currency:    c.key,
        nickname:    `${pkg.name} — ${pkg.quantity} × ${c.key.toUpperCase()}`,
      })
      ids[c.id] = created.id
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
