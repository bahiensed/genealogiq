'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@genealogiq/db'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/dal'
import { getSupplierCategorySchema, type SupplierCategoryFormValues } from '@/schemas/supplier-category.schema'
import { identityTranslator } from '@/schemas/i18n'

type ActionError = { error: string }
type ActionSuccess = { success: string }
type CreateSuccess = { success: string; category: { id: string; name: string } }

export async function createSupplierCategory(data: SupplierCategoryFormValues): Promise<ActionError | CreateSuccess> {
  await verifyAdmin()

  const validated = getSupplierCategorySchema(identityTranslator).safeParse(data)
  if (!validated.success) return { error: 'Invalid data' }

  let created: { id: string; name: string }
  try {
    created = await prisma.supplierCategory.create({ data: validated.data, select: { id: true, name: true } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { error: 'A category with this name already exists' }
    }
    throw e
  }

  revalidatePath('/categories/suppliers')
  return { success: 'Category created successfully.', category: created }
}

export async function updateSupplierCategory(id: string, data: SupplierCategoryFormValues): Promise<ActionError | ActionSuccess> {
  await verifyAdmin()

  const validated = getSupplierCategorySchema(identityTranslator).safeParse(data)
  if (!validated.success) return { error: 'Invalid data' }

  try {
    const existing = await prisma.supplierCategory.findFirst({ where: { name: validated.data.name, tenantId: null }, select: { id: true } })
    if (existing && existing.id !== id) return { error: 'A category with this name already exists' }

    await prisma.supplierCategory.update({ where: { id }, data: validated.data })
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
  await verifyAdmin()

  const count = await prisma.supplier.count({ where: { categoryId: id } })
  if (count > 0) return { error: 'Cannot delete: category is assigned to one or more suppliers.' }

  try {
    await prisma.supplierCategory.delete({ where: { id } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Category not found.' }
    }
    throw e
  }

  revalidatePath('/categories/suppliers')
}

export async function toggleSupplierCategoryActive(id: string): Promise<ActionError | void> {
  await verifyAdmin()

  const category = await prisma.supplierCategory.findUnique({ where: { id }, select: { isActive: true } })
  if (!category) return { error: 'Category not found.' }

  await prisma.supplierCategory.update({ where: { id }, data: { isActive: !category.isActive } })
  revalidatePath('/categories/suppliers')
}
