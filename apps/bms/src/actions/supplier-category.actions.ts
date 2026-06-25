'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { Prisma } from '@genealogiq/db'
import { prisma } from '@/lib/prisma'
import { ok, done, fail, type ActionResult } from '@genealogiq/core'
import { verifyAdmin } from '@/lib/dal'
import { getSupplierCategorySchema, type SupplierCategoryFormValues } from '@/schemas/supplier-category.schema'
import { identityTranslator } from '@/schemas/i18n'

export async function createSupplierCategory(data: SupplierCategoryFormValues): Promise<ActionResult<{ category: { id: string; name: string } }>> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const validated = getSupplierCategorySchema(identityTranslator).safeParse(data)
  if (!validated.success) return fail(t('common.invalidData'))

  let created: { id: string; name: string }
  try {
    created = await prisma.supplierCategory.create({ data: validated.data, select: { id: true, name: true } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return fail(t('supplierCategory.nameExists'))
    }
    throw e
  }

  revalidatePath('/categories/suppliers')
  return ok({ category: created }, t('supplierCategory.created'))
}

export async function updateSupplierCategory(id: string, data: SupplierCategoryFormValues): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const validated = getSupplierCategorySchema(identityTranslator).safeParse(data)
  if (!validated.success) return fail(t('common.invalidData'))

  try {
    const existing = await prisma.supplierCategory.findFirst({ where: { name: validated.data.name, tenantId: null }, select: { id: true } })
    if (existing && existing.id !== id) return fail(t('supplierCategory.nameExists'))

    await prisma.supplierCategory.update({ where: { id }, data: validated.data })
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
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const count = await prisma.supplier.count({ where: { categoryId: id } })
  if (count > 0) return fail(t('supplierCategory.hasSuppliers'))

  try {
    await prisma.supplierCategory.delete({ where: { id } })
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
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const category = await prisma.supplierCategory.findUnique({ where: { id }, select: { isActive: true } })
  if (!category) return fail(t('supplierCategory.notFound'))

  await prisma.supplierCategory.update({ where: { id }, data: { isActive: !category.isActive } })
  revalidatePath('/categories/suppliers')
  return done()
}
