'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { Prisma } from '@genealogiq/db'
import { prisma } from '@/lib/prisma'
import { ok, done, fail, type ActionResult } from '@genealogiq/core'
import { verifyAdmin } from '@/lib/dal'
import { getCustomerCategorySchema, type CustomerCategoryFormValues } from '@/schemas/customer-category.schema'
import { identityTranslator } from '@/schemas/i18n'

export async function createCustomerCategory(
  data: CustomerCategoryFormValues,
): Promise<ActionResult<{ category: { id: string; name: string } }>> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const validated = getCustomerCategorySchema(identityTranslator).safeParse(data)
  if (!validated.success) return fail(t('common.invalidData'))

  let created: { id: string; name: string }
  try {
    created = await prisma.tenantCategory.create({ data: validated.data, select: { id: true, name: true } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return fail(t('common.duplicate'))
    }
    throw e
  }

  revalidatePath('/categories/customers')
  return ok({ category: created }, t('customerCategory.created'))
}

export async function updateCustomerCategory(id: string, data: CustomerCategoryFormValues): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const validated = getCustomerCategorySchema(identityTranslator).safeParse(data)
  if (!validated.success) return fail(t('common.invalidData'))

  try {
    const existing = await prisma.tenantCategory.findFirst({ where: { name: validated.data.name, tenantId: null }, select: { id: true } })
    if (existing && existing.id !== id) return fail(t('common.duplicate'))

    await prisma.tenantCategory.update({ where: { id }, data: validated.data })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return fail(t('customerCategory.notFound'))
    }
    throw e
  }

  revalidatePath('/categories/customers')
  return done(t('customerCategory.updated'))
}

export async function deleteCustomerCategory(id: string): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const count = await prisma.tenant.count({ where: { categoryId: id } })
  if (count > 0) return fail(t('customerCategory.inUse'))

  try {
    await prisma.tenantCategory.delete({ where: { id } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return fail(t('customerCategory.notFound'))
    }
    throw e
  }

  revalidatePath('/categories/customers')
  return done()
}

export async function toggleCustomerCategoryActive(id: string): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const category = await prisma.tenantCategory.findUnique({ where: { id }, select: { isActive: true } })
  if (!category) return fail(t('customerCategory.notFound'))

  await prisma.tenantCategory.update({ where: { id }, data: { isActive: !category.isActive } })
  revalidatePath('/categories/customers')
  return done()
}
