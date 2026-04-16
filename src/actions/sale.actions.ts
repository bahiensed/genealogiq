'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'
import { saleSchema, type SaleFormValues } from '@/schemas/sale.schema'

type ActionError   = { error: string }
type ActionSuccess = { success: string }

export async function createSale(data: SaleFormValues): Promise<ActionError | ActionSuccess> {
  const session = await verifySession()

  const validated = saleSchema.safeParse(data)
  if (!validated.success) return { error: 'Invalid data' }

  const { packageId, customerId, quantity, soldAt } = validated.data

  const pkg = await prisma.package.findUnique({
    where:  { id: packageId },
    select: { quantity: true, licenseId: true },
  })
  if (!pkg) return { error: 'Package not found.' }

  const totalLicenses = pkg.quantity * quantity

  await prisma.$transaction(async (tx) => {
    await tx.sale.create({
      data: {
        packageId,
        customerId,
        quantity,
        soldAt:   new Date(soldAt),
        soldById: session.user!.id,
      },
    })

    await tx.customerLicense.upsert({
      where:  { customerId_licenseId: { customerId, licenseId: pkg.licenseId } },
      create: { customerId, licenseId: pkg.licenseId, quantity: totalLicenses },
      update: { quantity: { increment: totalLicenses } },
    })
  })

  revalidatePath('/manual-sales')
  return { success: 'Sale recorded successfully.' }
}

export async function deleteSale(id: number): Promise<ActionError | void> {
  await verifySession()

  const sale = await prisma.sale.findUnique({
    where:  { id },
    select: { quantity: true, packageId: true, customerId: true, package: { select: { quantity: true, licenseId: true } } },
  })
  if (!sale) return { error: 'Sale not found.' }

  const totalLicenses = sale.package.quantity * sale.quantity

  try {
    await prisma.$transaction(async (tx) => {
      await tx.sale.delete({ where: { id } })

      const cl = await tx.customerLicense.findUnique({
        where:  { customerId_licenseId: { customerId: sale.customerId, licenseId: sale.package.licenseId } },
        select: { id: true, quantity: true },
      })

      if (cl) {
        const newQty = cl.quantity - totalLicenses
        if (newQty <= 0) {
          await tx.customerLicense.delete({ where: { id: cl.id } })
        } else {
          await tx.customerLicense.update({ where: { id: cl.id }, data: { quantity: newQty } })
        }
      }
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Sale not found.' }
    }
    throw e
  }

  revalidatePath('/manual-sales')
}
