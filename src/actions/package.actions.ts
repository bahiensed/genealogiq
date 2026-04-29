'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'
import { packageSchema, type PackageFormValues } from '@/schemas/package.schema'

type ActionError   = { error: string }
type ActionSuccess = { success: string }

export async function createPackage(data: PackageFormValues): Promise<ActionError | ActionSuccess> {
  await verifySession()

  const validated = packageSchema.safeParse(data)
  if (!validated.success) return { error: 'Invalid data' }

  const { price, ...rest } = validated.data

  await prisma.package.create({
    data: { ...rest, price: new Prisma.Decimal(price) },
  })

  revalidatePath('/packages')
  return { success: 'Package created successfully.' }
}

export async function updatePackage(id: string, data: PackageFormValues): Promise<ActionError | ActionSuccess> {
  await verifySession()

  const validated = packageSchema.safeParse(data)
  if (!validated.success) return { error: 'Invalid data' }

  const { price, ...rest } = validated.data

  try {
    await prisma.package.update({
      where: { id },
      data:  { ...rest, price: new Prisma.Decimal(price) },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Package not found.' }
    }
    throw e
  }

  revalidatePath('/packages')
  return { success: 'Package updated successfully.' }
}

export async function deletePackage(id: string): Promise<ActionError | void> {
  await verifySession()

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
}

export async function togglePackageActive(id: string): Promise<ActionError | void> {
  await verifySession()

  const pkg = await prisma.package.findUnique({ where: { id }, select: { isActive: true } })
  if (!pkg) return { error: 'Package not found.' }

  await prisma.package.update({ where: { id }, data: { isActive: !pkg.isActive } })
  revalidatePath('/packages')
}
