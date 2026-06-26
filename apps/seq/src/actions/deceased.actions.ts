'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { Prisma } from '@genealogiq/db'
import { done, fail, type ActionResult } from '@genealogiq/core'
import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'
import { assertOwnership } from '@genealogiq/auth/authz'
import { getDeceasedSchema, type DeceasedFormValues } from '@/schemas/deceased.schema'
import { identityTranslator } from '@/schemas/i18n'

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
): Promise<ActionResult> {
  const { customerId } = await verifyTenantSession()
  const t = await getTranslations('Actions')

  const guardian = await prisma.appUser.findUnique({
    where:  { id: appUserId, tenantId: customerId },
    select: {
      id: true,
      appSales: {
        // Only genuinely-active subscriptions can take a new memorial: status is
        // never flipped off 'active', so without the currentPeriodEnd check SEQ
        // would assign memorials to EXPIRED sales — and the APP (which gates
        // features on currentPeriodEnd > now) would show them as FREE on day one.
        where:  { status: 'active', currentPeriodEnd: { gt: new Date() } },
        select: {
          id:           true,
          subscription: { select: { maxProfiles: true } },
          _count:       { select: { assignedTo: true } },
        },
      },
    },
  })
  if (!guardian) return fail(t('deceased.customerNotFound'))

  const availableSale = guardian.appSales.find(
    (s) => s._count.assignedTo < s.subscription.maxProfiles
  )
  if (!availableSale) return fail(t('deceased.noQrAvailable'))

  const validated = getDeceasedSchema(identityTranslator).safeParse(data)
  if (!validated.success) return fail(t('common.invalidData'))

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
      return fail(t('common.duplicate'))
    }
    throw e
  }

  revalidatePath(`/customers/${appUserId}`)
  return done()
}

export async function updateDeceased(id: string, data: DeceasedFormValues): Promise<ActionResult> {
  const { customerId } = await verifyTenantSession()
  const t = await getTranslations('Actions')

  const validated = getDeceasedSchema(identityTranslator).safeParse(data)
  if (!validated.success) return fail(t('common.invalidData'))

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
      return fail(t('deceased.notFound'))
    }
    throw e
  }

  revalidatePath('/customers')
  return done()
}

export async function deleteDeceased(id: string): Promise<ActionResult> {
  const { customerId } = await verifyTenantSession()
  const t = await getTranslations('Actions')

  const guardian = await prisma.appUserGuardian.findFirst({
    where:  { appUserId: id },
    select: { guardianId: true },
  })

  try {
    await prisma.appUser.delete({ where: { id, tenantId: customerId } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return fail(t('deceased.notFound'))
    }
    throw e
  }

  revalidatePath('/customers')
  if (guardian) revalidatePath(`/customers/${guardian.guardianId}`)
  return done()
}

export async function addGuardian(
  memorialId: string,
  guardianId: string,
): Promise<ActionResult> {
  const { customerId } = await verifyTenantSession()
  const t = await getTranslations('Actions')

  // Both the memorial and the guardian must belong to the caller's tenant,
  // otherwise a tenant user could link profiles across tenants (IDOR).
  const scoped = assertOwnership(
    await prisma.appUser.count({ where: { id: { in: [memorialId, guardianId] }, tenantId: customerId } }),
    (c) => c === 2,
    t('deceased.notFound'),
  )
  if (!scoped.ok) return fail(scoped.error)

  try {
    await prisma.appUserGuardian.create({
      data: { appUserId: memorialId, guardianId },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return fail(t('deceased.relationExists'))
    }
    throw e
  }

  revalidatePath('/customers')
  return done(t('deceased.guardianAdded'))
}

export async function removeGuardian(
  memorialId: string,
  guardianId: string,
): Promise<ActionResult> {
  const { customerId } = await verifyTenantSession()
  const t = await getTranslations('Actions')

  // Both ids must belong to the caller's tenant (see addGuardian) — prevents
  // unlinking guardians of memorials owned by another tenant (IDOR).
  const scoped = assertOwnership(
    await prisma.appUser.count({ where: { id: { in: [memorialId, guardianId] }, tenantId: customerId } }),
    (c) => c === 2,
    t('deceased.relationNotFound'),
  )
  if (!scoped.ok) return fail(scoped.error)

  try {
    await prisma.appUserGuardian.delete({
      where: { appUserId_guardianId: { appUserId: memorialId, guardianId } },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return fail(t('deceased.relationNotFound'))
    }
    throw e
  }

  revalidatePath('/customers')
  return done()
}
