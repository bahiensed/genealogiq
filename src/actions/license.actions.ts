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

  await prisma.license.create({ data: validated.data })

  revalidatePath('/licenses')
  return { success: 'License created successfully.' }
}

export async function updateLicense(id: string, data: LicenseFormValues): Promise<ActionError | ActionSuccess> {
  await verifySession()

  const validated = licenseSchema.safeParse(data)
  if (!validated.success) return { error: 'Invalid data' }

  try {
    await prisma.license.update({ where: { id }, data: validated.data })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'License not found.' }
    }
    throw e
  }

  revalidatePath('/licenses')
  return { success: 'License updated successfully.' }
}

export async function deleteLicense(id: string): Promise<ActionError | void> {
  await verifySession()

  const packageCount = await prisma.package.count({ where: { licenseId: id } })
  if (packageCount > 0) {
    return { error: 'This license is assigned to one or more packages and cannot be deleted.' }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.customerLicense.deleteMany({ where: { licenseId: id } })
      await tx.license.delete({ where: { id } })
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'License not found.' }
    }
    throw e
  }

  revalidatePath('/licenses')
}

export async function toggleLicenseActive(id: string): Promise<ActionError | void> {
  await verifySession()

  const license = await prisma.license.findUnique({ where: { id }, select: { isActive: true } })
  if (!license) return { error: 'License not found.' }

  await prisma.license.update({ where: { id }, data: { isActive: !license.isActive } })
  revalidatePath('/licenses')
}
