'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'
import { supplierCategorySchema, type SupplierCategoryFormValues } from '@/schemas/supplier-category.schema'

type ActionError = { error: string }
type ActionSuccess = { success: string }
type CreateSuccess = { success: string; category: { id: string; name: string } }

export async function createSupplierCategory(data: SupplierCategoryFormValues): Promise<ActionError | CreateSuccess> {
  await verifySession()

  const validated = supplierCategorySchema.safeParse(data)
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

  revalidatePath('/supplier-categories')
  return { success: 'Category created successfully.', category: created }
}

export async function updateSupplierCategory(id: string, data: SupplierCategoryFormValues): Promise<ActionError | ActionSuccess> {
  await verifySession()

  const validated = supplierCategorySchema.safeParse(data)
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

  revalidatePath('/supplier-categories')
  return { success: 'Category updated successfully.' }
}

export async function deleteSupplierCategory(id: string): Promise<ActionError | void> {
  await verifySession()

  try {
    await prisma.supplierCategory.delete({ where: { id } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Category not found.' }
    }
    throw e
  }

  revalidatePath('/supplier-categories')
}

export async function toggleSupplierCategoryActive(id: string): Promise<ActionError | void> {
  await verifySession()

  const category = await prisma.supplierCategory.findUnique({ where: { id }, select: { isActive: true } })
  if (!category) return { error: 'Category not found.' }

  await prisma.supplierCategory.update({ where: { id }, data: { isActive: !category.isActive } })
  revalidatePath('/supplier-categories')
}
