'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'
import { sendAppWelcomeEmail } from '@/lib/email'
import { appUserSchema, type AppUserFormValues } from '@/schemas/app-user.schema'
import { deceasedSchema, type DeceasedFormValues } from '@/schemas/deceased.schema'

type ActionError = { error: string }
type ActionSuccess = { success: string }

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

export async function createCustomerWithDeceased(
  appUserData: AppUserFormValues,
  deceasedData: DeceasedFormValues,
): Promise<ActionError | ActionSuccess> {
  const { customerId } = await verifyTenantSession()

  const validatedUser = appUserSchema.safeParse(appUserData)
  if (!validatedUser.success) return { error: 'Dados do cliente inválidos' }

  const validatedDeceased = deceasedSchema.safeParse(deceasedData)
  if (!validatedDeceased.success) return { error: 'Dados do falecido inválidos' }

  const { address, birthDate, categoryId, ...userRest } = validatedUser.data
  const { birthDate: dBirthDate, deathDate, burialDate, burialLatitude, burialLongitude, ...deceasedRest } = validatedDeceased.data

  let appUserToken: string | null = null

  try {
    ;({ appUserToken } = await prisma.$transaction(async (tx) => {
      const appUser = await tx.appUser.create({
        data: {
          ...userRest,
          birthDate:  toDate(birthDate),
          categoryId: categoryId || null,
          tenantId:   customerId,
          address:    buildAddressWrite(address),
        },
        select: { id: true },
      })

      const deceased = await tx.deceased.create({
        data: {
          ...deceasedRest,
          birthDate:       toDate(dBirthDate),
          deathDate:       toDate(deathDate),
          burialDate:      toDate(burialDate),
          burialLatitude:  burialLatitude ?? null,
          burialLongitude: burialLongitude ?? null,
          tenantId:        customerId,
        },
        select: { id: true },
      })

      await tx.deceasedGuardian.create({
        data: {
          appUserId:  appUser.id,
          deceasedId: deceased.id,
          isPrimary:  true,
        },
      })

      const existingUser = await tx.user.findUnique({
        where: { email: userRest.email },
        select: { id: true },
      })
      if (existingUser) return { appUserToken: null }

      const authUser = await tx.user.create({
        data: {
          firstName:     userRest.firstName,
          lastName:      userRest.lastName,
          email:         userRest.email,
          role:          'APP_USER',
          customerId,
          password:      null,
          emailVerified: new Date(),
        },
        select: { id: true },
      })

      await tx.appUser.update({
        where: { id: appUser.id },
        data:  { userId: authUser.id },
      })

      const t = randomBytes(32).toString('hex')
      await tx.passwordResetToken.create({
        data: { token: t, userId: authUser.id, expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) },
      })

      return { appUserToken: t }
    }))
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { error: 'Dados duplicados detectados' }
    }
    throw e
  }

  if (appUserToken) {
    await sendAppWelcomeEmail(userRest.email, appUserToken)
  }

  revalidatePath('/customers')
  return { success: 'Cliente criado com sucesso.' }
}

export async function updateCustomer(id: string, data: AppUserFormValues): Promise<ActionError | ActionSuccess> {
  const { customerId } = await verifyTenantSession()

  const validated = appUserSchema.safeParse(data)
  if (!validated.success) return { error: 'Dados inválidos' }

  const { address, birthDate, categoryId, ...rest } = validated.data

  try {
    await prisma.appUser.update({
      where: { id, tenantId: customerId },
      data: {
        ...rest,
        birthDate:  toDate(birthDate),
        categoryId: categoryId || null,
        address:    buildAddressWrite(address),
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Cliente não encontrado.' }
    }
    throw e
  }

  revalidatePath('/customers')
  return { success: 'Cliente atualizado com sucesso.' }
}

export async function deleteCustomer(id: string): Promise<ActionError | void> {
  const { customerId } = await verifyTenantSession()

  try {
    await prisma.appUser.delete({ where: { id, tenantId: customerId } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Cliente não encontrado.' }
    }
    throw e
  }

  revalidatePath('/customers')
}

export async function toggleCustomerActive(id: string): Promise<ActionError | void> {
  const { customerId } = await verifyTenantSession()

  const appUser = await prisma.appUser.findUnique({
    where:  { id, tenantId: customerId },
    select: { isActive: true },
  })
  if (!appUser) return { error: 'Cliente não encontrado.' }

  await prisma.appUser.update({ where: { id }, data: { isActive: !appUser.isActive } })
  revalidatePath('/customers')
}
