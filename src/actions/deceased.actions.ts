'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'
import { deceasedSchema, type DeceasedFormValues } from '@/schemas/deceased.schema'

type ActionError = { error: string }
type ActionSuccess = { success: string }

function toDate(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null
}

export async function createDeceased(
  appUserId: string,
  data: DeceasedFormValues,
): Promise<ActionError | ActionSuccess> {
  const { customerId } = await verifyTenantSession()

  // Verify the appUser belongs to this tenant and check license availability
  const appUser = await prisma.appUser.findUnique({
    where:  { id: appUserId, tenantId: customerId },
    select: { id: true, _count: { select: { appSales: true, guardianships: true } } },
  })
  if (!appUser) return { error: 'Customer not found.' }

  const available = appUser._count.appSales - appUser._count.guardianships
  if (available <= 0) return { error: 'No licenses available for this customer.' }

  const validated = deceasedSchema.safeParse(data)
  if (!validated.success) return { error: 'Invalid data' }

  const { birthDate, deathDate, burialDate, burialLatitude, burialLongitude, ...rest } = validated.data

  try {
    await prisma.$transaction(async (tx) => {
      const deceased = await tx.deceased.create({
        data: {
          ...rest,
          birthDate:       toDate(birthDate),
          deathDate:       toDate(deathDate),
          burialDate:      toDate(burialDate),
          burialLatitude:  burialLatitude ?? null,
          burialLongitude: burialLongitude ?? null,
          tenantId:        customerId,
        },
        select: { id: true },
      })

      await tx.deceasedGuardian.create({
        data: { appUserId, deceasedId: deceased.id, isPrimary: true },
      })
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { error: 'Duplicate data detected' }
    }
    throw e
  }

  revalidatePath(`/customers/${appUserId}`)
  return { success: 'Memorialized profile created successfully.' }
}

export async function updateDeceased(id: string, data: DeceasedFormValues): Promise<ActionError | ActionSuccess> {
  const { customerId } = await verifyTenantSession()

  const validated = deceasedSchema.safeParse(data)
  if (!validated.success) return { error: 'Invalid data' }

  const { birthDate, deathDate, burialDate, burialLatitude, burialLongitude, ...rest } = validated.data

  try {
    await prisma.deceased.update({
      where: { id, tenantId: customerId },
      data: {
        ...rest,
        birthDate:       toDate(birthDate),
        deathDate:       toDate(deathDate),
        burialDate:      toDate(burialDate),
        burialLatitude:  burialLatitude ?? null,
        burialLongitude: burialLongitude ?? null,
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Profile not found.' }
    }
    throw e
  }

  revalidatePath('/customers')
  return { success: 'Profile updated successfully.' }
}

export async function deleteDeceased(id: string): Promise<ActionError | void> {
  const { customerId } = await verifyTenantSession()

  try {
    await prisma.deceased.delete({ where: { id, tenantId: customerId } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Profile not found.' }
    }
    throw e
  }

  revalidatePath('/customers')
}

export async function addGuardian(
  deceasedId: string,
  appUserId: string,
): Promise<ActionError | ActionSuccess> {
  await verifyTenantSession()

  try {
    await prisma.deceasedGuardian.create({
      data: { deceasedId, appUserId, isPrimary: false },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { error: 'Relation already exists.' }
    }
    throw e
  }

  revalidatePath('/customers')
  return { success: 'Guardian added.' }
}

export async function removeGuardian(
  deceasedId: string,
  appUserId: string,
): Promise<ActionError | void> {
  await verifyTenantSession()

  try {
    await prisma.deceasedGuardian.delete({
      where: { deceasedId_appUserId: { deceasedId, appUserId } },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Relation not found.' }
    }
    throw e
  }

  revalidatePath('/customers')
}
