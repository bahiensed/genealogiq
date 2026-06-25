'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@genealogiq/db'
import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'
import { getSupplierCategorySchema, type SupplierCategoryFormValues } from '@/schemas/supplier-category.schema'
import { identityTranslator } from '@/schemas/i18n'

type ActionError = { error: string }
type ActionSuccess = { success: string }

export async function createSupplierCategory(data: SupplierCategoryFormValues): Promise<ActionError | ActionSuccess> {
  const { customerId } = await verifyTenantSession()

  const validated = getSupplierCategorySchema(identityTranslator).safeParse(data)
  if (!validated.success) return { error: 'Invalid data' }

  try {
    await prisma.supplierCategory.create({ data: { ...validated.data, tenantId: customerId } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { error: 'A category with this name already exists' }
    }
    throw e
  }

  revalidatePath('/categories/suppliers')
  return { success: 'Category created successfully.' }
}

export async function updateSupplierCategory(id: string, data: SupplierCategoryFormValues): Promise<ActionError | ActionSuccess> {
  const { customerId } = await verifyTenantSession()

  const validated = getSupplierCategorySchema(identityTranslator).safeParse(data)
  if (!validated.success) return { error: 'Invalid data' }

  try {
    const existing = await prisma.supplierCategory.findUnique({
      where: { tenantId_name: { tenantId: customerId, name: validated.data.name } },
      select: { id: true },
    })
    if (existing && existing.id !== id) return { error: 'A category with this name already exists' }

    await prisma.supplierCategory.update({ where: { id, tenantId: customerId }, data: validated.data })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Category not found.' }
    }
    throw e
  }

  revalidatePath('/categories/suppliers')
  return { success: 'Category updated successfully.' }
}

export async function deleteSupplierCategory(id: string): Promise<ActionError | void> {
  const { customerId } = await verifyTenantSession()

  try {
    await prisma.supplierCategory.delete({ where: { id, tenantId: customerId } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Category not found.' }
    }
    throw e
  }

  revalidatePath('/categories/suppliers')
}

export async function toggleSupplierCategoryActive(id: string): Promise<ActionError | void> {
  const { customerId } = await verifyTenantSession()

  const category = await prisma.supplierCategory.findUnique({ where: { id, tenantId: customerId }, select: { isActive: true } })
  if (!category) return { error: 'Category not found.' }

  await prisma.supplierCategory.update({ where: { id }, data: { isActive: !category.isActive } })
  revalidatePath('/categories/suppliers')
}
