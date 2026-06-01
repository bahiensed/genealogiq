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

function buildBurialAddress(street?: string | null, number?: string | null, complement?: string | null): string | null {
  const parts = [street, number, complement].filter(Boolean).join(' ')
  return parts || null
}

function buildGeolocationData(data: DeceasedFormValues) {
  const { burialLatitude, burialLongitude, burialDate, burialZip, burialSite,
          burialStreet, burialNumber, burialComplement, burialNeighborhood,
          burialCity, burialState, burialCountry } = data

  if (burialLatitude == null || burialLongitude == null) return null

  return {
    lat:      burialLatitude,
    lon:      burialLongitude,
    placeName: burialSite || 'Burial site',
    date:     toDate(burialDate),
    zip:      burialZip ?? null,
    address:  buildBurialAddress(burialStreet, burialNumber, burialComplement),
    section:  burialNeighborhood ?? null,
    city:     burialCity    ?? null,
    state:    burialState   ?? null,
    country:  burialCountry ?? null,
  }
}

export async function createDeceased(
  appUserId: string,
  data: DeceasedFormValues,
): Promise<ActionError | ActionSuccess> {
  const { customerId } = await verifyTenantSession()

  const guardian = await prisma.appUser.findUnique({
    where:  { id: appUserId, tenantId: customerId },
    select: {
      id: true,
      appSales: {
        where:  { status: 'active' },
        select: {
          id:           true,
          subscription: { select: { maxProfiles: true } },
          _count:       { select: { assignedTo: true } },
        },
      },
    },
  })
  if (!guardian) return { error: 'Customer not found.' }

  const availableSale = guardian.appSales.find(
    (s) => s._count.assignedTo < s.subscription.maxProfiles
  )
  if (!availableSale) return { error: 'No QR codes available for this customer.' }

  const validated = deceasedSchema.safeParse(data)
  if (!validated.success) return { error: 'Invalid data' }

  const {
    birthDate, deathDate, deathCity,
    burialDate, burialLatitude, burialLongitude,
    burialSite, burialZip, burialStreet, burialNumber, burialComplement,
    burialNeighborhood, burialCity, burialState, burialCountry,
    ...rest
  } = validated.data

  const geoData = buildGeolocationData(validated.data)

  try {
    await prisma.$transaction(async (tx) => {
      const memorial = await tx.appUser.create({
        data: {
          ...rest,
          role:       'APP_MEMO',
          birthDate:  toDate(birthDate),
          deathDate:  toDate(deathDate),
          deathPlace: deathCity ?? null,
          tenantId:   customerId,
          appSaleId:  availableSale.id,
        },
        select: { id: true },
      })

      await tx.appUserGuardian.create({
        data: { appUserId: memorial.id, guardianId: appUserId },
      })

      await tx.appSale.update({
        where: { id: availableSale.id },
        data:  { assignedTo: { connect: { id: memorial.id } } },
      })

      if (geoData) {
        await tx.geolocation.create({ data: { userId: memorial.id, ...geoData } })
      }

      await tx.qrCode.create({
        data: {
          appUserId: memorial.id,
          url: `${process.env.APP_URL}/profile/${memorial.id}`,
        },
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

  const {
    birthDate, deathDate, deathCity,
    burialDate, burialLatitude, burialLongitude,
    burialSite, burialZip, burialStreet, burialNumber, burialComplement,
    burialNeighborhood, burialCity, burialState, burialCountry,
    ...rest
  } = validated.data

  const geoData = buildGeolocationData(validated.data)

  try {
    await prisma.$transaction(async (tx) => {
      await tx.appUser.update({
        where: { id, tenantId: customerId },
        data: {
          ...rest,
          birthDate:  toDate(birthDate),
          deathDate:  toDate(deathDate),
          deathPlace: deathCity ?? null,
        },
      })

      if (geoData) {
        await tx.geolocation.upsert({
          where:  { userId: id },
          create: { userId: id, ...geoData },
          update: geoData,
        })
      } else {
        await tx.geolocation.deleteMany({ where: { userId: id } })
      }
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

  const guardian = await prisma.appUserGuardian.findFirst({
    where:  { appUserId: id },
    select: { guardianId: true },
  })

  try {
    await prisma.appUser.delete({ where: { id, tenantId: customerId } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Profile not found.' }
    }
    throw e
  }

  revalidatePath('/customers')
  if (guardian) revalidatePath(`/customers/${guardian.guardianId}`)
}

export async function addGuardian(
  memorialId: string,
  guardianId: string,
): Promise<ActionError | ActionSuccess> {
  await verifyTenantSession()

  try {
    await prisma.appUserGuardian.create({
      data: { appUserId: memorialId, guardianId },
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
  memorialId: string,
  guardianId: string,
): Promise<ActionError | void> {
  await verifyTenantSession()

  try {
    await prisma.appUserGuardian.delete({
      where: { appUserId_guardianId: { appUserId: memorialId, guardianId } },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Relation not found.' }
    }
    throw e
  }

  revalidatePath('/customers')
}
