'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { Prisma } from '@genealogiq/db'
import { done, fail, type ActionResult } from '@genealogiq/core'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/dal'
import { getSaleSchema, type SaleFormValues } from '@/schemas/sale.schema'
import { identityTranslator } from '@/schemas/i18n'
import { generateGenCode } from '@/lib/gen-code'

export async function createSale(data: SaleFormValues): Promise<ActionResult> {
  const session = await verifyAdmin()
  const t = await getTranslations('Actions')

  const validated = getSaleSchema(identityTranslator).safeParse(data)
  if (!validated.success) return fail(t('common.invalidData'))

  const { packageId, tenantId, quantity } = validated.data

  const pkg = await prisma.package.findUnique({
    where:  { id: packageId },
    select: { quantity: true },
  })
  if (!pkg) return fail(t('sale.packageNotFound'))

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

    const licenses = Array.from({ length: totalCodes }, () => ({
      id:        crypto.randomUUID(),
      genCode:   generateGenCode(),
      saleId:    sale.id,
      packageId,
      tenantId,
    }))
    await tx.genCode.createMany({ data: licenses })
  })

  revalidatePath('/sales/manual-sales')
  revalidatePath('/gencodes')
  return done(t('sale.created'))
}

export async function reverseSale(id: number): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const sale = await prisma.sale.findUnique({
    where:  { id },
    select: {
      quantity:   true,
      tenantId:   true,
      reversedAt: true,
      package:    { select: { quantity: true } },
    },
  })
  if (!sale) return fail(t('sale.notFound'))
  if (sale.reversedAt) return fail(t('sale.alreadyReversed'))

  try {
    await prisma.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id },
        data:  { reversedAt: new Date() },
      })

      // Delete only AVAILABLE licenses. SOLD ones were written off by the
      // tenant and ACTIVATED ones are linked to a memorial — reversing the B2B
      // sale must not reach into either.
      await tx.genCode.deleteMany({
        where: { saleId: id, status: 'AVAILABLE' },
      })
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return fail(t('sale.notFound'))
    }
    throw e
  }

  revalidatePath('/sales/manual-sales')
  revalidatePath('/gencodes')
  return done()
}
