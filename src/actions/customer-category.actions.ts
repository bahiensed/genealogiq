'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'
import { customerCategorySchema, type CustomerCategoryFormValues } from '@/schemas/customer-category.schema'

type ActionError = { error: string }
type ActionSuccess = { success: string }

export async function createCustomerCategory(data: CustomerCategoryFormValues): Promise<ActionError | ActionSuccess> {
  const { customerId } = await verifyTenantSession()

  const validated = customerCategorySchema.safeParse(data)
  if (!validated.success) return { error: 'Dados inválidos' }

  try {
    await prisma.appUserCategory.create({ data: { ...validated.data, tenantId: customerId } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { error: 'Já existe uma categoria com este nome' }
    }
    throw e
  }

  revalidatePath('/customer-categories')
  return { success: 'Categoria criada com sucesso.' }
}

export async function updateCustomerCategory(id: string, data: CustomerCategoryFormValues): Promise<ActionError | ActionSuccess> {
  const { customerId } = await verifyTenantSession()

  const validated = customerCategorySchema.safeParse(data)
  if (!validated.success) return { error: 'Dados inválidos' }

  try {
    const existing = await prisma.appUserCategory.findUnique({
      where:  { tenantId_name: { tenantId: customerId, name: validated.data.name } },
      select: { id: true },
    })
    if (existing && existing.id !== id) return { error: 'Já existe uma categoria com este nome' }

    await prisma.appUserCategory.update({ where: { id, tenantId: customerId }, data: validated.data })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Categoria não encontrada.' }
    }
    throw e
  }

  revalidatePath('/customer-categories')
  return { success: 'Categoria atualizada com sucesso.' }
}

export async function deleteCustomerCategory(id: string): Promise<ActionError | void> {
  const { customerId } = await verifyTenantSession()

  try {
    await prisma.appUserCategory.delete({ where: { id, tenantId: customerId } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Categoria não encontrada.' }
    }
    throw e
  }

  revalidatePath('/customer-categories')
}

export async function toggleCustomerCategoryActive(id: string): Promise<ActionError | void> {
  const { customerId } = await verifyTenantSession()

  const category = await prisma.appUserCategory.findUnique({
    where:  { id, tenantId: customerId },
    select: { isActive: true },
  })
  if (!category) return { error: 'Categoria não encontrada.' }

  await prisma.appUserCategory.update({ where: { id }, data: { isActive: !category.isActive } })
  revalidatePath('/customer-categories')
}
