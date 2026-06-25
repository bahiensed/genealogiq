'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { Prisma } from '@genealogiq/db'
import { done, fail, type ActionResult } from '@genealogiq/core'
import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'
import { getSupplierSchema, type SupplierFormValues } from '@/schemas/supplier.schema'
import { identityTranslator } from '@/schemas/i18n'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildAddressWrite(address: SupplierFormValues['address']): any {
  if (!address) return undefined
  const hasData = Object.entries(address).some(([k, v]) => k !== 'country' && v)
  if (!hasData && !address.country) return undefined
  return { upsert: { create: address, update: address } }
}

export async function createSupplier(data: SupplierFormValues): Promise<ActionResult> {
  const t = await getTranslations('Actions')
  const { customerId } = await verifyTenantSession()

  const validated = getSupplierSchema(identityTranslator).safeParse(data)
  if (!validated.success) return fail(t('common.invalidData'))

  const { address, birthDate, categoryId, ...rest } = validated.data

  const dup = await prisma.supplier.findFirst({ where: { taxId: rest.taxId, tenantId: customerId }, select: { id: true } })
  if (dup) return fail(t('supplier.taxIdExists'))

  try {
    await prisma.supplier.create({
      data: {
        ...rest,
        birthDate:  birthDate ? new Date(birthDate) : null,
        categoryId: categoryId || null,
        tenantId:   customerId,
        address:    buildAddressWrite(address),
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return fail(t('common.duplicate'))
    }
    throw e
  }

  revalidatePath('/suppliers')
  return done(t('supplier.created'))
}

export async function updateSupplier(id: string, data: SupplierFormValues): Promise<ActionResult> {
  const t = await getTranslations('Actions')
  const { customerId } = await verifyTenantSession()

  const validated = getSupplierSchema(identityTranslator).safeParse(data)
  if (!validated.success) return fail(t('common.invalidData'))

  const { address, birthDate, categoryId, ...rest } = validated.data

  const dup = await prisma.supplier.findFirst({ where: { taxId: rest.taxId, tenantId: customerId, NOT: { id } }, select: { id: true } })
  if (dup) return fail(t('supplier.taxIdExists'))

  try {
    await prisma.supplier.update({
      where: { id, tenantId: customerId },
      data: {
        ...rest,
        birthDate:  birthDate ? new Date(birthDate) : null,
        categoryId: categoryId || null,
        address:    buildAddressWrite(address),
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return fail(t('supplier.notFound'))
    }
    throw e
  }

  revalidatePath('/suppliers')
  return done(t('supplier.updated'))
}

export async function deleteSupplier(id: string): Promise<ActionResult> {
  const t = await getTranslations('Actions')
  const { customerId } = await verifyTenantSession()

  try {
    await prisma.supplier.delete({ where: { id, tenantId: customerId } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return fail(t('supplier.notFound'))
    }
    throw e
  }

  revalidatePath('/suppliers')
  return done()
}

export async function toggleSupplierActive(id: string): Promise<ActionResult> {
  const t = await getTranslations('Actions')
  const { customerId } = await verifyTenantSession()

  const supplier = await prisma.supplier.findUnique({ where: { id, tenantId: customerId }, select: { isActive: true } })
  if (!supplier) return fail(t('supplier.notFound'))

  await prisma.supplier.update({ where: { id }, data: { isActive: !supplier.isActive } })
  revalidatePath('/suppliers')
  return done()
}
