'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@genealogiq/db'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { verifyAdmin } from '@/lib/dal'
import { getPackageSchema, type PackageFormValues } from '@/schemas/package.schema'
import { identityTranslator } from '@/schemas/i18n'

type ActionError   = { error: string }
type ActionSuccess = { success: string }

export async function createPackage(data: PackageFormValues): Promise<ActionError | ActionSuccess> {
  await verifyAdmin()

  const validated = getPackageSchema(identityTranslator).safeParse(data)
  if (!validated.success) return { error: 'Invalid data' }

  const { price, ...rest } = validated.data

  await prisma.package.create({
    data: { ...rest, price: new Prisma.Decimal(price) },
  })

  revalidatePath('/packages')
  revalidatePath('/physical-qr')
  return { success: 'Package created successfully.' }
}

export async function updatePackage(id: string, data: PackageFormValues): Promise<ActionError | ActionSuccess> {
  await verifyAdmin()

  const validated = getPackageSchema(identityTranslator).safeParse(data)
  if (!validated.success) return { error: 'Invalid data' }

  const { price, ...rest } = validated.data
  const newPrice = new Prisma.Decimal(price)

  const current = await prisma.package.findUnique({
    where:  { id },
    select: { price: true, stripePriceId: true },
  })
  if (!current) return { error: 'Package not found.' }

  // Stripe Prices are immutable. If admin changes price on a synced package,
  // clear the Stripe refs — checkout action will refuse purchases until the
  // SEQ seed script re-runs and provisions a fresh Price.
  const priceChanged = !current.price.equals(newPrice)
  const clearStripeRefs = priceChanged && !!current.stripePriceId

  try {
    await prisma.package.update({
      where: { id },
      data:  {
        ...rest,
        price: newPrice,
        ...(clearStripeRefs && { stripeProductId: null, stripePriceId: null }),
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Package not found.' }
    }
    throw e
  }

  revalidatePath('/packages')
  revalidatePath('/physical-qr')
  return {
    success: clearStripeRefs
      ? 'Package updated — Stripe references cleared. Re-run prisma/seed-stripe-packages.ts in SEQ.'
      : 'Package updated successfully.',
  }
}

export async function deletePackage(id: string): Promise<ActionError | void> {
  await verifyAdmin()

  try {
    await prisma.package.delete({ where: { id } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Package not found.' }
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
      return { error: 'This package has associated sales and cannot be deleted.' }
    }
    throw e
  }

  revalidatePath('/packages')
  revalidatePath('/physical-qr')
}

export async function togglePackageActive(id: string): Promise<ActionError | void> {
  await verifyAdmin()

  const pkg = await prisma.package.findUnique({ where: { id }, select: { isActive: true } })
  if (!pkg) return { error: 'Package not found.' }

  await prisma.package.update({ where: { id }, data: { isActive: !pkg.isActive } })
  revalidatePath('/packages')
  revalidatePath('/physical-qr')
}

// Push the saved package's data to Stripe: create/update the Product and, if missing,
// create the Price. Mirrors apps/seq/prisma/seed-stripe.ts but runs on demand from BMS.
// Stripe Prices are immutable — updatePackage() clears stripePriceId on a price change,
// so a fresh Price is minted here on the next sync.
export async function syncPackageWithStripe(id: string): Promise<ActionError | ActionSuccess> {
  await verifyAdmin()

  const pkg = await prisma.package.findUnique({
    where:  { id },
    select: {
      id: true, name: true, description: true, price: true, quantity: true,
      stripeProductId: true, stripePriceId: true,
    },
  })
  if (!pkg) return { error: 'Package not found.' }

  const priceCents = Math.round(Number(pkg.price) * 100)
  if (priceCents <= 0) return { error: 'Set a price greater than zero before syncing.' }

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
    const message = e instanceof Error ? e.message : 'Unknown error'
    return { error: `Stripe sync failed: ${message}` }
  }

  revalidatePath('/packages')
  revalidatePath('/physical-qr')
  return { success: 'Synced with Stripe successfully.' }
}
