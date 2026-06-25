'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { Prisma } from '@genealogiq/db'
import { done, fail, type ActionResult } from '@genealogiq/core'
import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'
import { getSupplierCategorySchema, type SupplierCategoryFormValues } from '@/schemas/supplier-category.schema'
import { identityTranslator } from '@/schemas/i18n'

export async function createSupplierCategory(data: SupplierCategoryFormValues): Promise<ActionResult> {
  const t = await getTranslations('Actions')
  const { customerId } = await verifyTenantSession()

  const validated = getSupplierCategorySchema(identityTranslator).safeParse(data)
  if (!validated.success) return fail(t('common.invalidData'))

  try {
    await prisma.supplierCategory.create({ data: { ...validated.data, tenantId: customerId } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return fail(t('common.duplicate'))
    }
    throw e
  }

  revalidatePath('/categories/suppliers')
  return done(t('supplierCategory.created'))
}

export async function updateSupplierCategory(id: string, data: SupplierCategoryFormValues): Promise<ActionResult> {
  const t = await getTranslations('Actions')
  const { customerId } = await verifyTenantSession()

  const validated = getSupplierCategorySchema(identityTranslator).safeParse(data)
  if (!validated.success) return fail(t('common.invalidData'))

  try {
    const existing = await prisma.supplierCategory.findUnique({
      where: { tenantId_name: { tenantId: customerId, name: validated.data.name } },
      select: { id: true },
    })
    if (existing && existing.id !== id) return fail(t('common.duplicate'))

    await prisma.supplierCategory.update({ where: { id, tenantId: customerId }, data: validated.data })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return fail(t('supplierCategory.notFound'))
    }
    throw e
  }

  revalidatePath('/categories/suppliers')
  return done(t('supplierCategory.updated'))
}

export async function deleteSupplierCategory(id: string): Promise<ActionResult> {
  const t = await getTranslations('Actions')
  const { customerId } = await verifyTenantSession()

  try {
    await prisma.supplierCategory.delete({ where: { id, tenantId: customerId } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return fail(t('supplierCategory.notFound'))
    }
    throw e
  }

  revalidatePath('/categories/suppliers')
  return done()
}

export async function toggleSupplierCategoryActive(id: string): Promise<ActionResult> {
  const t = await getTranslations('Actions')
  const { customerId } = await verifyTenantSession()

  const category = await prisma.supplierCategory.findUnique({ where: { id, tenantId: customerId }, select: { isActive: true } })
  if (!category) return fail(t('supplierCategory.notFound'))

  await prisma.supplierCategory.update({ where: { id }, data: { isActive: !category.isActive } })
  revalidatePath('/categories/suppliers')
  return done()
}
