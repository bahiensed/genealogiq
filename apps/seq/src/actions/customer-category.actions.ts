'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@genealogiq/db'
import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'
import { getCustomerCategorySchema, type CustomerCategoryFormValues } from '@/schemas/customer-category.schema'
import { identityTranslator } from '@/schemas/i18n'

type ActionError = { error: string }
type ActionSuccess = { success: string }
type CreateCategorySuccess = { category: { id: string; name: string } }

export async function createCustomerCategory(data: CustomerCategoryFormValues): Promise<ActionError | CreateCategorySuccess> {
  const { customerId } = await verifyTenantSession()

  const validated = getCustomerCategorySchema(identityTranslator).safeParse(data)
  if (!validated.success) return { error: 'Invalid data' }

  let category: { id: string; name: string }
  try {
    category = await prisma.appUserCategory.create({
      data:   { ...validated.data, tenantId: customerId },
      select: { id: true, name: true },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { error: 'A category with this name already exists' }
    }
    throw e
  }

  revalidatePath('/categories/customers')
  return { category }
}

export async function updateCustomerCategory(id: string, data: CustomerCategoryFormValues): Promise<ActionError | ActionSuccess> {
  const { customerId } = await verifyTenantSession()

  const validated = getCustomerCategorySchema(identityTranslator).safeParse(data)
  if (!validated.success) return { error: 'Invalid data' }

  try {
    const existing = await prisma.appUserCategory.findUnique({
      where:  { tenantId_name: { tenantId: customerId, name: validated.data.name } },
      select: { id: true },
    })
    if (existing && existing.id !== id) return { error: 'A category with this name already exists' }

    await prisma.appUserCategory.update({ where: { id, tenantId: customerId }, data: validated.data })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Category not found.' }
    }
    throw e
  }

  revalidatePath('/categories/customers')
  return { success: 'Category updated successfully.' }
}

export async function deleteCustomerCategory(id: string): Promise<ActionError | void> {
  const { customerId } = await verifyTenantSession()

  try {
    await prisma.appUserCategory.delete({ where: { id, tenantId: customerId } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Category not found.' }
    }
    throw e
  }

  revalidatePath('/categories/customers')
}

export async function toggleCustomerCategoryActive(id: string): Promise<ActionError | void> {
  const { customerId } = await verifyTenantSession()

  const category = await prisma.appUserCategory.findUnique({
    where:  { id, tenantId: customerId },
    select: { isActive: true },
  })
  if (!category) return { error: 'Category not found.' }

  await prisma.appUserCategory.update({ where: { id }, data: { isActive: !category.isActive } })
  revalidatePath('/categories/customers')
}
