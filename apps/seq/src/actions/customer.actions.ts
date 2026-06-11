'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { Prisma } from '@genealogiq/db'
import { hashToken } from '@genealogiq/core'
import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'
import { sendAppWelcomeEmail } from '@/lib/email'
import { appUserSchema, type AppUserFormValues } from '@/schemas/app-user.schema'
import { deceasedSchema, type DeceasedFormValues } from '@/schemas/deceased.schema'

type ActionError = { error: string }
type ActionSuccess = { success: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildAddressCreate(address: AppUserFormValues['address']): any {
  if (!address) return undefined
  const hasData = Object.entries(address).some(([k, v]) => k !== 'country' && v)
  if (!hasData && !address.country) return undefined
  return { create: address }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildAddressWrite(address: AppUserFormValues['address']): any {
  if (!address) return undefined
  const hasData = Object.entries(address).some(([k, v]) => k !== 'country' && v)
  if (!hasData && !address.country) return undefined
  return { upsert: { create: address, update: address } }
}

function toDate(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null
}

export async function createCustomer(
  appUserData: AppUserFormValues,
): Promise<ActionError | ActionSuccess> {
  const { customerId } = await verifyTenantSession()

  const validated = appUserSchema.safeParse(appUserData)
  if (!validated.success) return { error: 'Invalid data' }

  const { address, birthDate, categoryId, ...rest } = validated.data

  try {
    await prisma.appUser.create({
      data: {
        ...rest,
        birthDate: toDate(birthDate),
        tenant:    { connect: { id: customerId } },
        category:  categoryId ? { connect: { id: categoryId } } : undefined,
        address:   buildAddressCreate(address),
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { error: 'An account with this email already exists.' }
    }
    throw e
  }

  revalidatePath('/customers')
  return { success: 'Customer created successfully.' }
}

export async function createCustomerWithDeceased(
  appUserData: AppUserFormValues,
  deceasedData: DeceasedFormValues,
): Promise<ActionError | ActionSuccess> {
  const { customerId } = await verifyTenantSession()

  const validatedUser = appUserSchema.safeParse(appUserData)
  if (!validatedUser.success) return { error: 'Invalid data' }

  const validatedDeceased = deceasedSchema.safeParse(deceasedData)
  if (!validatedDeceased.success) return { error: 'Invalid data' }

  const { address, birthDate, categoryId, ...userRest } = validatedUser.data
  const { birthDate: dBirthDate, deathDate, burialDate, burialLatitude, burialLongitude, ...deceasedRest } = validatedDeceased.data

  try {
    await prisma.$transaction(async (tx) => {
      const appUser = await tx.appUser.create({
        data: {
          ...userRest,
          birthDate: toDate(birthDate),
          tenant:    { connect: { id: customerId } },
          category:  categoryId ? { connect: { id: categoryId } } : undefined,
          address:   buildAddressCreate(address),
        },
        select: { id: true },
      })

      const { deathCity,
              burialSite, burialZip, burialStreet, burialNumber, burialComplement,
              burialNeighborhood, burialCity, burialState, burialCountry, ...memoRest } = deceasedRest

      const memorial = await tx.appUser.create({
        data: {
          ...memoRest,
          role:       'APP_MEMO',
          birthDate:  toDate(dBirthDate),
          deathDate:  toDate(deathDate),
          deathPlace: (deathCity as string | null | undefined) ?? null,
          tenantId:   customerId,
        },
        select: { id: true },
      })

      await tx.appUserGuardian.create({
        data: { appUserId: memorial.id, guardianId: appUser.id },
      })

      if (burialLatitude != null && burialLongitude != null) {
        const address = [burialStreet, burialNumber, burialComplement].filter(Boolean).join(' ') || null
        await tx.geolocation.create({
          data: {
            userId:    memorial.id,
            placeName: (burialSite as string | null | undefined) || 'Burial site',
            lat:       burialLatitude as number,
            lon:       burialLongitude as number,
            date:      toDate(burialDate as string | null | undefined),
            zip:       (burialZip as string | null | undefined) ?? null,
            address,
            section:   (burialNeighborhood as string | null | undefined) ?? null,
            city:      (burialCity as string | null | undefined) ?? null,
            state:     (burialState as string | null | undefined) ?? null,
            country:   (burialCountry as string | null | undefined) ?? null,
          },
        })
      }

    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { error: 'Duplicate data detected' }
    }
    throw e
  }

  revalidatePath('/customers')
  return { success: 'Customer created successfully.' }
}

export async function updateCustomer(id: string, data: AppUserFormValues): Promise<ActionError | ActionSuccess> {
  const { customerId } = await verifyTenantSession()

  const validated = appUserSchema.safeParse(data)
  if (!validated.success) return { error: 'Invalid data' }

  const { address, birthDate, categoryId, ...rest } = validated.data

  try {
    await prisma.appUser.update({
      where: { id, tenantId: customerId },
      data: {
        ...rest,
        birthDate: toDate(birthDate),
        category:  categoryId ? { connect: { id: categoryId } } : { disconnect: true },
        address:   buildAddressWrite(address),
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Customer not found.' }
    }
    throw e
  }

  revalidatePath('/customers')
  return { success: 'Customer updated successfully.' }
}

export async function deleteCustomer(id: string): Promise<ActionError | void> {
  const { customerId } = await verifyTenantSession()

  const saleCount = await prisma.appSale.count({ where: { appUserId: id } })
  if (saleCount > 0) return { error: 'Cannot delete customer with existing sales.' }

  const soloGuardianships = await prisma.appUserGuardian.count({
    where: {
      guardianId: id,
      appUser: {
        role: 'APP_MEMO',
        guardedBy: { every: { guardianId: id } },
      },
    },
  })
  if (soloGuardianships > 0)
    return { error: 'Cannot delete customer: they are the sole guardian of one or more memorialized profiles.' }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.appUserGuardian.deleteMany({
        where: { OR: [{ guardianId: id }, { appUserId: id }] },
      })
      await tx.appUser.delete({ where: { id, tenantId: customerId } })
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2025') return { error: 'Customer not found.' }
      return { error: `Failed to delete customer (${e.code}).` }
    }
    return { error: 'An unexpected error occurred.' }
  }

  revalidatePath('/customers')
}

export async function resendCustomerEmail(id: string): Promise<ActionError | void> {
  const { customerId } = await verifyTenantSession()

  const appUser = await prisma.appUser.findUnique({
    where:  { id, tenantId: customerId },
    select: { id: true, email: true, password: true, firstName: true },
  })
  if (!appUser) return { error: 'Customer not found.' }
  if (!appUser.email) return { error: 'Customer has no email address.' }
  if (appUser.password) return { error: 'This customer has already set their password.' }

  await prisma.passwordResetToken.deleteMany({ where: { appUserId: id } })

  const token = randomBytes(32).toString('hex')
  await prisma.passwordResetToken.create({
    data: { token: hashToken(token), appUserId: id, expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) },
  })

  await sendAppWelcomeEmail(appUser.email, token, appUser.firstName)
}

export async function toggleCustomerActive(id: string): Promise<ActionError | void> {
  const { customerId } = await verifyTenantSession()

  const appUser = await prisma.appUser.findUnique({
    where:  { id, tenantId: customerId },
    select: { isActive: true },
  })
  if (!appUser) return { error: 'Customer not found.' }

  await prisma.appUser.update({ where: { id }, data: { isActive: !appUser.isActive } })
  revalidatePath('/customers')
}
