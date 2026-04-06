'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'
import { supplierSchema, type SupplierFormValues } from '@/schemas/supplier.schema'

type ActionError = { error: string }
type ActionSuccess = { success: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildAddressWrite(address: SupplierFormValues['address']): any {
  if (!address) return undefined
  const hasData = Object.entries(address).some(([k, v]) => k !== 'country' && v)
  if (!hasData && !address.country) return undefined
  return { upsert: { create: address, update: address } }
}

export async function createSupplier(data: SupplierFormValues): Promise<ActionError | ActionSuccess> {
  const { customerId } = await verifyTenantSession()

  const validated = supplierSchema.safeParse(data)
  if (!validated.success) return { error: 'Dados inválidos' }

  const { address, birthDate, categoryId, ...rest } = validated.data

  try {
    await prisma.supplier.create({
      data: {
        ...rest,
        birthDate:  birthDate ? new Date(birthDate) : null,
        categoryId: categoryId || null,
        tenantId:   customerId,
        address:    buildAddressWrite(address),
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { error: 'Dados duplicados detectados' }
    }
    throw e
  }

  revalidatePath('/suppliers')
  return { success: 'Fornecedor criado com sucesso.' }
}

export async function updateSupplier(id: string, data: SupplierFormValues): Promise<ActionError | ActionSuccess> {
  const { customerId } = await verifyTenantSession()

  const validated = supplierSchema.safeParse(data)
  if (!validated.success) return { error: 'Dados inválidos' }

  const { address, birthDate, categoryId, ...rest } = validated.data

  try {
    await prisma.supplier.update({
      where: { id, tenantId: customerId },
      data: {
        ...rest,
        birthDate:  birthDate ? new Date(birthDate) : null,
        categoryId: categoryId || null,
        address:    buildAddressWrite(address),
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Fornecedor não encontrado.' }
    }
    throw e
  }

  revalidatePath('/suppliers')
  return { success: 'Fornecedor atualizado com sucesso.' }
}

export async function deleteSupplier(id: string): Promise<ActionError | void> {
  const { customerId } = await verifyTenantSession()

  try {
    await prisma.supplier.delete({ where: { id, tenantId: customerId } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Fornecedor não encontrado.' }
    }
    throw e
  }

  revalidatePath('/suppliers')
}

export async function toggleSupplierActive(id: string): Promise<ActionError | void> {
  const { customerId } = await verifyTenantSession()

  const supplier = await prisma.supplier.findUnique({ where: { id, tenantId: customerId }, select: { isActive: true } })
  if (!supplier) return { error: 'Fornecedor não encontrado.' }

  await prisma.supplier.update({ where: { id }, data: { isActive: !supplier.isActive } })
  revalidatePath('/suppliers')
}
