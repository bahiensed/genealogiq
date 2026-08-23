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

export async function createPackage(data: PackageFormValues): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const validated = getPackageSchema(identityTranslator).safeParse(data)
  if (!validated.success) return fail(t('common.invalidData'))

  const { price, ...rest } = validated.data

  await prisma.package.create({
    data: { ...rest, price: new Prisma.Decimal(price) },
  })

  revalidatePath('/packages')
  revalidatePath('/gencodes')
  return done(t('package.created'))
}

export async function updatePackage(id: string, data: PackageFormValues): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const validated = getPackageSchema(identityTranslator).safeParse(data)
  if (!validated.success) return fail(t('common.invalidData'))

  const { price, ...rest } = validated.data
  const newPrice = new Prisma.Decimal(price)

  const current = await prisma.package.findUnique({
    where:  { id },
    select: { price: true, stripePriceId: true },
  })
  if (!current) return fail(t('package.notFound'))

  // Stripe Prices are immutable. If admin changes price on a synced package,
  // clear the Price ref — checkout action will refuse purchases until
  // syncPackageWithStripe mints a fresh one. stripeProductId is left alone
  // and reused (Products ARE mutable) — mirrors Subscription/ExtraUnitPrice's
  // sync pattern instead of minting a brand-new Product on every price edit.
  const priceChanged = !current.price.equals(newPrice)
  const clearStripeRef = priceChanged && !!current.stripePriceId
  const staleId = current.stripePriceId

  try {
    await prisma.package.update({
      where: { id },
      data:  {
        ...rest,
        price: newPrice,
        ...(clearStripeRef && { stripePriceId: null }),
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return fail(t('package.notFound'))
    }
    throw e
  }

  // Best-effort: archive the superseded Stripe Price so it stops being
  // live/purchasable once orphaned from the DB. Never blocks the save.
  if (clearStripeRef && staleId) {
    await stripe.prices.update(staleId, { active: false }).catch(() => {})
  }

  revalidatePath('/packages')
  revalidatePath('/gencodes')
  return done(clearStripeRef ? t('package.updatedStripeCleared') : t('package.updated'))
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

  revalidatePath('/packages')
  revalidatePath('/gencodes')
  return done()
}

export async function togglePackageActive(id: string): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const pkg = await prisma.package.findUnique({ where: { id }, select: { isActive: true } })
  if (!pkg) return fail(t('package.notFound'))

  await prisma.package.update({ where: { id }, data: { isActive: !pkg.isActive } })
  revalidatePath('/packages')
  revalidatePath('/gencodes')
  return done()
}

// Push the saved package's data to Stripe: create/update the Product and, if missing,
// create the Price. Mirrors apps/seq/prisma/seed-stripe.ts but runs on demand from BMS.
// Stripe Prices are immutable — updatePackage() clears stripePriceId on a price change,
// so a fresh Price is minted here on the next sync.
export async function syncPackageWithStripe(id: string): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const pkg = await prisma.package.findUnique({
    where:  { id },
    select: {
      id: true, name: true, description: true, price: true, quantity: true,
      stripeProductId: true, stripePriceId: true,
    },
  })
  if (!pkg) return fail(t('package.notFound'))

  const priceCents = Math.round(Number(pkg.price) * 100)
  if (priceCents <= 0) return fail(t('package.priceRequired'))

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
        metadata:    { packageId: pkg.id, qrPerPackage: String(pkg.quantity) },
      })
      productId = product.id
    }

    let priceId = pkg.stripePriceId
    if (!priceId) {
      const price = await stripe.prices.create({
        product:     productId,
        unit_amount: priceCents,
        currency:    'usd',
        nickname:    `${pkg.name} — ${pkg.quantity} QR`,
      })
      priceId = price.id
    }

    await prisma.package.update({
      where: { id: pkg.id },
      data:  { stripeProductId: productId, stripePriceId: priceId },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : t('package.unknownError')
    return fail(t('package.stripeSyncFailed', { message }))
  }

  revalidatePath('/packages')
  revalidatePath('/gencodes')
  return done(t('package.synced'))
}
