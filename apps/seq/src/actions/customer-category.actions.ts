'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { Prisma } from '@genealogiq/db'
import { ok, done, fail, type ActionResult } from '@genealogiq/core'
import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'
import { getCustomerCategorySchema, type CustomerCategoryFormValues } from '@/schemas/customer-category.schema'
import { identityTranslator } from '@/schemas/i18n'

export async function createCustomerCategory(
  data: CustomerCategoryFormValues,
): Promise<ActionResult<{ category: { id: string; name: string } }>> {
  const { customerId } = await verifyTenantSession()
  const t = await getTranslations('Actions')

  const validated = getCustomerCategorySchema(identityTranslator).safeParse(data)
  if (!validated.success) return fail(t('common.invalidData'))

  let category: { id: string; name: string }
  try {
    category = await prisma.appUserCategory.create({
      data:   { ...validated.data, tenantId: customerId },
      select: { id: true, name: true },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return fail(t('customerCategory.nameExists'))
    }
    throw e
  }

  revalidatePath('/categories/customers')
  return ok({ category })
}

export async function updateCustomerCategory(id: string, data: CustomerCategoryFormValues): Promise<ActionResult> {
  const { customerId } = await verifyTenantSession()
  const t = await getTranslations('Actions')

  const validated = getCustomerCategorySchema(identityTranslator).safeParse(data)
  if (!validated.success) return fail(t('common.invalidData'))

  try {
    const existing = await prisma.appUserCategory.findUnique({
      where:  { tenantId_name: { tenantId: customerId, name: validated.data.name } },
      select: { id: true },
    })
    if (existing && existing.id !== id) return fail(t('customerCategory.nameExists'))

    await prisma.appUserCategory.update({ where: { id, tenantId: customerId }, data: validated.data })
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
  const { customerId } = await verifyTenantSession()
  const t = await getTranslations('Actions')

  try {
    await prisma.appUserCategory.delete({ where: { id, tenantId: customerId } })
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
  const { customerId } = await verifyTenantSession()
  const t = await getTranslations('Actions')

  const category = await prisma.appUserCategory.findUnique({
    where:  { id, tenantId: customerId },
    select: { isActive: true },
  })
  if (!category) return fail(t('customerCategory.notFound'))

  await prisma.appUserCategory.update({ where: { id }, data: { isActive: !category.isActive } })
  revalidatePath('/categories/customers')
  return done()
}
