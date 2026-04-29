'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'
import { licenseSchema, type LicenseFormValues } from '@/schemas/license.schema'

type ActionError   = { error: string }
type ActionSuccess = { success: string }

export async function createLicense(data: LicenseFormValues): Promise<ActionError | ActionSuccess> {
  await verifySession()

  const validated = licenseSchema.safeParse(data)
  if (!validated.success) return { error: 'Invalid data' }

  const { price, ...rest } = validated.data
  await prisma.license.create({ data: { ...rest, price: new Prisma.Decimal(price) } })

  revalidatePath('/subscriptions')
  return { success: 'Subscription created successfully.' }
}

export async function updateLicense(id: string, data: LicenseFormValues): Promise<ActionError | ActionSuccess> {
  await verifySession()

  const validated = licenseSchema.safeParse(data)
  if (!validated.success) return { error: 'Invalid data' }

  const { price, ...rest } = validated.data

  try {
    await prisma.license.update({ where: { id }, data: { ...rest, price: new Prisma.Decimal(price) } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Subscription not found.' }
    }
    throw e
  }

  revalidatePath('/subscriptions')
  return { success: 'Subscription updated successfully.' }
}

export async function deleteLicense(id: string): Promise<ActionError | void> {
  await verifySession()

  try {
    await prisma.license.delete({ where: { id } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Subscription not found.' }
    }
    throw e
  }

  revalidatePath('/subscriptions')
}

export async function toggleLicenseActive(id: string): Promise<ActionError | void> {
  await verifySession()

  const license = await prisma.license.findUnique({ where: { id }, select: { isActive: true } })
  if (!license) return { error: 'Subscription not found.' }

  await prisma.license.update({ where: { id }, data: { isActive: !license.isActive } })
  revalidatePath('/subscriptions')
}
