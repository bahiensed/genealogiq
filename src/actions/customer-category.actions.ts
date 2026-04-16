'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'
import { customerCategorySchema, type CustomerCategoryFormValues } from '@/schemas/customer-category.schema'

type ActionError = { error: string }
type ActionSuccess = { success: string }
type CreateSuccess = { success: string; category: { id: string; name: string } }

export async function createCustomerCategory(data: CustomerCategoryFormValues): Promise<ActionError | CreateSuccess> {
  await verifySession()

  const validated = customerCategorySchema.safeParse(data)
  if (!validated.success) return { error: 'Invalid data' }

  let created: { id: string; name: string }
  try {
    created = await prisma.customerCategory.create({ data: validated.data, select: { id: true, name: true } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { error: 'A category with this name already exists' }
    }
    throw e
  }

  revalidatePath('/customer-categories')
  return { success: 'Category created successfully.', category: created }
}

export async function updateCustomerCategory(id: string, data: CustomerCategoryFormValues): Promise<ActionError | ActionSuccess> {
  await verifySession()

  const validated = customerCategorySchema.safeParse(data)
  if (!validated.success) return { error: 'Invalid data' }

  try {
    const existing = await prisma.customerCategory.findFirst({ where: { name: validated.data.name, tenantId: null }, select: { id: true } })
    if (existing && existing.id !== id) return { error: 'A category with this name already exists' }

    await prisma.customerCategory.update({ where: { id }, data: validated.data })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Category not found.' }
    }
    throw e
  }

  revalidatePath('/customer-categories')
  return { success: 'Category updated successfully.' }
}

export async function deleteCustomerCategory(id: string): Promise<ActionError | void> {
  await verifySession()

  try {
    await prisma.customerCategory.delete({ where: { id } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Category not found.' }
    }
    throw e
  }

  revalidatePath('/customer-categories')
}

export async function toggleCustomerCategoryActive(id: string): Promise<ActionError | void> {
  await verifySession()

  const category = await prisma.customerCategory.findUnique({ where: { id }, select: { isActive: true } })
  if (!category) return { error: 'Category not found.' }

  await prisma.customerCategory.update({ where: { id }, data: { isActive: !category.isActive } })
  revalidatePath('/customer-categories')
}
