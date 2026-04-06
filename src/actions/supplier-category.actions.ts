'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'
import { supplierCategorySchema, type SupplierCategoryFormValues } from '@/schemas/supplier-category.schema'

type ActionError = { error: string }
type ActionSuccess = { success: string }

export async function createSupplierCategory(data: SupplierCategoryFormValues): Promise<ActionError | ActionSuccess> {
  const { customerId } = await verifyTenantSession()

  const validated = supplierCategorySchema.safeParse(data)
  if (!validated.success) return { error: 'Dados inválidos' }

  try {
    await prisma.supplierCategory.create({ data: { ...validated.data, tenantId: customerId } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { error: 'Já existe uma categoria com este nome' }
    }
    throw e
  }

  revalidatePath('/supplier-categories')
  return { success: 'Categoria criada com sucesso.' }
}

export async function updateSupplierCategory(id: string, data: SupplierCategoryFormValues): Promise<ActionError | ActionSuccess> {
  const { customerId } = await verifyTenantSession()

  const validated = supplierCategorySchema.safeParse(data)
  if (!validated.success) return { error: 'Dados inválidos' }

  try {
    const existing = await prisma.supplierCategory.findUnique({
      where: { tenantId_name: { tenantId: customerId, name: validated.data.name } },
      select: { id: true },
    })
    if (existing && existing.id !== id) return { error: 'Já existe uma categoria com este nome' }

    await prisma.supplierCategory.update({ where: { id, tenantId: customerId }, data: validated.data })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Categoria não encontrada.' }
    }
    throw e
  }

  revalidatePath('/supplier-categories')
  return { success: 'Categoria atualizada com sucesso.' }
}

export async function deleteSupplierCategory(id: string): Promise<ActionError | void> {
  const { customerId } = await verifyTenantSession()

  try {
    await prisma.supplierCategory.delete({ where: { id, tenantId: customerId } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Categoria não encontrada.' }
    }
    throw e
  }

  revalidatePath('/supplier-categories')
}

export async function toggleSupplierCategoryActive(id: string): Promise<ActionError | void> {
  const { customerId } = await verifyTenantSession()

  const category = await prisma.supplierCategory.findUnique({ where: { id, tenantId: customerId }, select: { isActive: true } })
  if (!category) return { error: 'Categoria não encontrada.' }

  await prisma.supplierCategory.update({ where: { id }, data: { isActive: !category.isActive } })
  revalidatePath('/supplier-categories')
}
