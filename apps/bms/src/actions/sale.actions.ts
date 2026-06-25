'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@genealogiq/db'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/dal'
import { getSaleSchema, type SaleFormValues } from '@/schemas/sale.schema'
import { identityTranslator } from '@/schemas/i18n'
import { generateGenCode } from '@/lib/gen-code'

type ActionError   = { error: string }
type ActionSuccess = { success: string }

export async function createSale(data: SaleFormValues): Promise<ActionError | ActionSuccess> {
  const session = await verifyAdmin()

  const validated = getSaleSchema(identityTranslator).safeParse(data)
  if (!validated.success) return { error: 'Invalid data' }

  const { packageId, tenantId, quantity } = validated.data

  const pkg = await prisma.package.findUnique({
    where:  { id: packageId },
    select: { quantity: true, type: true },
  })
  if (!pkg) return { error: 'Package not found.' }

  const totalCodes = pkg.quantity * quantity

  await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        packageId,
        tenantId,
        quantity,
        soldById: session.user!.id,
      },
    })

    if (pkg.type === 'PHYSICAL') {
      const licenses = Array.from({ length: totalCodes }, () => ({
        id:        crypto.randomUUID(),
        genCode:   generateGenCode(),
        saleId:    sale.id,
        packageId,
        tenantId,
      }))
      await tx.physicalQrLicense.createMany({ data: licenses })
    } else {
      await tx.qrInventory.upsert({
        where:  { tenantId },
        create: { tenantId, quantity: totalCodes },
        update: { quantity: { increment: totalCodes } },
      })
    }
  })

  revalidatePath('/sales/manual-sales')
  revalidatePath('/physical-qr')
  return { success: 'Sale recorded successfully.' }
}

export async function reverseSale(id: number): Promise<ActionError | void> {
  await verifyAdmin()

  const sale = await prisma.sale.findUnique({
    where:  { id },
    select: {
      quantity:   true,
      tenantId:   true,
      reversedAt: true,
      package:    { select: { quantity: true, type: true } },
    },
  })
  if (!sale) return { error: 'Sale not found.' }
  if (sale.reversedAt) return { error: 'This sale has already been reversed.' }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id },
        data:  { reversedAt: new Date() },
      })

      if (sale.package.type === 'PHYSICAL') {
        // Delete only AVAILABLE licenses — ACTIVATED ones remain linked to memorials
        await tx.physicalQrLicense.deleteMany({
          where: { saleId: id, status: 'AVAILABLE' },
        })
      } else {
        const totalQRCodes = sale.package.quantity * sale.quantity
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
      }
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Sale not found.' }
    }
    throw e
  }

  revalidatePath('/sales/manual-sales')
  revalidatePath('/physical-qr')
}
