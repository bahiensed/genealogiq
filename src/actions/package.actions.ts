'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/dal'
import { packageSchema, type PackageFormValues } from '@/schemas/package.schema'

type ActionError   = { error: string }
type ActionSuccess = { success: string }

export async function createPackage(data: PackageFormValues): Promise<ActionError | ActionSuccess> {
  await verifyAdmin()

  const validated = packageSchema.safeParse(data)
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

  const validated = packageSchema.safeParse(data)
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
