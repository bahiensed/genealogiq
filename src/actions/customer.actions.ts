'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'
import { sendAppWelcomeEmail } from '@/lib/email'
import { customerSchema, type CustomerFormValues } from '@/schemas/customer.schema'

type ActionError = { error: string }
type ActionSuccess = { success: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildAddressWrite(address: CustomerFormValues['address']): any {
  if (!address) return undefined
  const hasData = Object.entries(address).some(([k, v]) => k !== 'country' && v)
  if (!hasData && !address.country) return undefined
  return { upsert: { create: address, update: address } }
}

export async function createCustomer(data: CustomerFormValues): Promise<ActionError | ActionSuccess> {
  const { customerId } = await verifyTenantSession()

  const validated = customerSchema.safeParse(data)
  if (!validated.success) return { error: 'Dados inválidos' }

  const { address, birthDate, categoryId, ...rest } = validated.data

  let appUserToken: string | null = null

  try {
    ;({ appUserToken } = await prisma.$transaction(async (tx) => {
      await tx.customer.create({
        data: {
          ...rest,
          birthDate:  birthDate ? new Date(birthDate) : null,
          categoryId: categoryId || null,
          tenantId:   customerId,
          address:    buildAddressWrite(address),
        },
      })

      const existingUser = await tx.user.findUnique({
        where: { email: rest.email },
        select: { id: true },
      })
      if (existingUser) return { appUserToken: null }

      const appUser = await tx.user.create({
        data: {
          firstName:     rest.name,
          lastName:      rest.tradeName,
          email:         rest.email,
          role:          'APP_USER',
          customerId,
          password:      null,
          emailVerified: new Date(),
        },
        select: { id: true },
      })

      const t = randomBytes(32).toString('hex')
      await tx.passwordResetToken.create({
        data: { token: t, userId: appUser.id, expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) },
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
    await sendAppWelcomeEmail(rest.email, appUserToken)
  }

  revalidatePath('/customers')
  return { success: 'Cliente criado com sucesso.' }
}

export async function updateCustomer(id: string, data: CustomerFormValues): Promise<ActionError | ActionSuccess> {
  const { customerId } = await verifyTenantSession()

  const validated = customerSchema.safeParse(data)
  if (!validated.success) return { error: 'Dados inválidos' }

  const { address, birthDate, categoryId, ...rest } = validated.data

  try {
    await prisma.customer.update({
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
    await prisma.customer.delete({ where: { id, tenantId: customerId } })
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

  const customer = await prisma.customer.findUnique({ where: { id, tenantId: customerId }, select: { isActive: true } })
  if (!customer) return { error: 'Cliente não encontrado.' }

  await prisma.customer.update({ where: { id }, data: { isActive: !customer.isActive } })
  revalidatePath('/customers')
}
