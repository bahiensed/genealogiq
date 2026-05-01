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

  const { packageId, tenantId, quantity } = validated.data

  const pkg = await prisma.package.findUnique({
    where:  { id: packageId },
    select: { quantity: true },
  })
  if (!pkg) return { error: 'Package not found.' }

  const totalQRCodes = pkg.quantity * quantity

  await prisma.$transaction(async (tx) => {
    await tx.sale.create({
      data: {
        packageId,
        tenantId,
        quantity,
        soldById: session.user!.id,
      },
    })

    await tx.qrInventory.upsert({
      where:  { tenantId },
      create: { tenantId, quantity: totalQRCodes },
      update: { quantity: { increment: totalQRCodes } },
    })
  })

  revalidatePath('/manual-sales')
  return { success: 'Sale recorded successfully.' }
}

export async function deleteSale(id: number): Promise<ActionError | void> {
  await verifySession()

  const sale = await prisma.sale.findUnique({
    where:  { id },
    select: { quantity: true, packageId: true, tenantId: true, package: { select: { quantity: true } } },
  })
  if (!sale) return { error: 'Sale not found.' }

  const totalQRCodes = sale.package.quantity * sale.quantity

  try {
    await prisma.$transaction(async (tx) => {
      await tx.sale.delete({ where: { id } })

      const inv = await tx.qrInventory.findUnique({
        where:  { tenantId: sale.tenantId },
        select: { id: true, quantity: true },
      })

      if (inv) {
        const newQty = inv.quantity - totalQRCodes
        if (newQty <= 0) {
          await tx.qrInventory.delete({ where: { id: inv.id } })
        } else {
          await tx.qrInventory.update({ where: { id: inv.id }, data: { quantity: newQty } })
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
