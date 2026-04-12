'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'
import { sendWelcomeEmail } from '@/lib/email'
import { userSchema, type UserFormValues } from '@/schemas/user.schema'

type ActionError = { error: string }
type ActionSuccess = { success: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildAddressCreate(address: UserFormValues['address']): any {
  if (!address) return undefined
  const hasData = Object.entries(address).some(([k, v]) => k !== 'country' && v)
  if (!hasData && !address.country) return undefined
  return { create: address }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildAddressWrite(address: UserFormValues['address']): any {
  if (!address) return undefined
  const hasData = Object.entries(address).some(([k, v]) => k !== 'country' && v)
  if (!hasData && !address.country) return undefined
  return { upsert: { create: address, update: address } }
}

export async function createUser(data: UserFormValues): Promise<ActionError | ActionSuccess> {
  const { customerId } = await verifyTenantSession()

  const validated = userSchema.safeParse(data)
  if (!validated.success) return { error: 'Dados inválidos' }

  const { address, birthDate, ...rest } = validated.data

  let token: string
  try {
    ;({ token } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          ...rest,
          customer:      { connect: { id: customerId } },
          birthDate:     birthDate ? new Date(birthDate) : null,
          password:      null,
          emailVerified: new Date(),
          address:       buildAddressCreate(address),
        },
        select: { id: true },
      })
      const t = randomBytes(32).toString('hex')
      await tx.passwordResetToken.create({
        data: { token: t, userId: user.id, expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) },
      })
      return { token: t }
    }))
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { error: 'Este e-mail já está em uso' }
    }
    throw e
  }

  await sendWelcomeEmail(rest.email, token)

  revalidatePath('/users')
  return { success: 'Usuário criado com sucesso.' }
}

export async function updateUser(id: string, data: UserFormValues): Promise<ActionError | ActionSuccess> {
  const { customerId } = await verifyTenantSession()

  const validated = userSchema.safeParse(data)
  if (!validated.success) return { error: 'Dados inválidos' }

  const { address, birthDate, ...rest } = validated.data

  try {
    const existing = await prisma.user.findUnique({ where: { email: rest.email }, select: { id: true } })
    if (existing && existing.id !== id) return { error: 'Este e-mail já está em uso' }

    await prisma.user.update({
      where: { id, customerId },
      data: {
        ...rest,
        birthDate: birthDate ? new Date(birthDate) : null,
        address:   buildAddressWrite(address),
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Usuário não encontrado.' }
    }
    throw e
  }

  revalidatePath('/users')
  return { success: 'Usuário atualizado com sucesso.' }
}

export async function deleteUser(userId: string): Promise<ActionError | void> {
  const session = await verifyTenantSession()

  if (session.user!.id === userId) return { error: 'Você não pode excluir sua própria conta.' }

  try {
    await prisma.user.delete({ where: { id: userId, customerId: session.customerId } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Usuário não encontrado.' }
    }
    throw e
  }

  revalidatePath('/users')
}

export async function toggleUserActive(userId: string): Promise<ActionError | void> {
  const session = await verifyTenantSession()

  if (session.user!.id === userId) return { error: 'Você não pode desativar sua própria conta.' }

  const user = await prisma.user.findUnique({ where: { id: userId, customerId: session.customerId }, select: { isActive: true } })
  if (!user) return { error: 'Usuário não encontrado.' }

  await prisma.user.update({ where: { id: userId }, data: { isActive: !user.isActive } })
  revalidatePath('/users')
}

export async function resendWelcomeEmail(userId: string): Promise<ActionError | void> {
  const { customerId } = await verifyTenantSession()

  const user = await prisma.user.findUnique({ where: { id: userId, customerId }, select: { email: true, password: true } })
  if (!user) return { error: 'Usuário não encontrado.' }
  if (user.password) return { error: 'Este usuário já definiu sua senha.' }

  await prisma.passwordResetToken.deleteMany({ where: { userId } })

  const token = randomBytes(32).toString('hex')
  await prisma.passwordResetToken.create({
    data: { token, userId, expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) },
  })

  await sendWelcomeEmail(user.email, token)
}
