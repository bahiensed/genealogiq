'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@genealogiq/db'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/dal'
import { supplierSchema, type SupplierFormValues } from '@/schemas/supplier.schema'

type ActionError = { error: string }
type ActionSuccess = { success: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildAddressWrite(address: SupplierFormValues['address'], mode: 'create' | 'update'): any {
  if (!address) return undefined
  const hasData = Object.entries(address).some(([k, v]) => k !== 'country' && v)
  if (!hasData && !address.country) return undefined
  return mode === 'create'
    ? { create: address }
    : { upsert: { create: address, update: address } }
}

export async function createSupplier(data: SupplierFormValues): Promise<ActionError | ActionSuccess> {
  await verifyAdmin()

  const validated = supplierSchema.safeParse(data)
  if (!validated.success) return { error: 'Invalid data' }

  const { address, birthDate, categoryId, ...rest } = validated.data

  const dup = await prisma.supplier.findFirst({ where: { taxId: rest.taxId }, select: { id: true } })
  if (dup) return { error: 'A supplier with this tax ID already exists' }

  try {
    await prisma.supplier.create({
      data: {
        ...rest,
        birthDate: birthDate ? new Date(birthDate) : null,
        category:  categoryId ? { connect: { id: categoryId } } : undefined,
        address:   buildAddressWrite(address, 'create'),
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { error: 'Duplicate data detected' }
    }
    throw e
  }

  revalidatePath('/suppliers')
  return { success: 'Supplier created successfully.' }
}

export async function updateSupplier(id: string, data: SupplierFormValues): Promise<ActionError | ActionSuccess> {
  await verifyAdmin()

  const validated = supplierSchema.safeParse(data)
  if (!validated.success) return { error: 'Invalid data' }

  const { address, birthDate, categoryId, ...rest } = validated.data

  const dup = await prisma.supplier.findFirst({ where: { taxId: rest.taxId, NOT: { id } }, select: { id: true } })
  if (dup) return { error: 'A supplier with this tax ID already exists' }

  try {
    await prisma.supplier.update({
      where: { id },
      data: {
        ...rest,
        birthDate: birthDate ? new Date(birthDate) : null,
        category:  categoryId ? { connect: { id: categoryId } } : { disconnect: true },
        address:   buildAddressWrite(address, 'update'),
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Supplier not found.' }
    }
    throw e
  }

  revalidatePath('/suppliers')
  return { success: 'Supplier updated successfully.' }
}

export async function deleteSupplier(id: string): Promise<ActionError | void> {
  await verifyAdmin()

  try {
    await prisma.supplier.delete({ where: { id } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Supplier not found.' }
    }
    throw e
  }

  revalidatePath('/suppliers')
}

export async function toggleSupplierActive(id: string): Promise<ActionError | void> {
  await verifyAdmin()

  const supplier = await prisma.supplier.findUnique({ where: { id }, select: { isActive: true } })
  if (!supplier) return { error: 'Supplier not found.' }

  await prisma.supplier.update({ where: { id }, data: { isActive: !supplier.isActive } })
  revalidatePath('/suppliers')
}
