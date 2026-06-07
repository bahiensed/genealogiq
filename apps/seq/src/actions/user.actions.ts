'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { hashToken } from '@genealogiq/core'
import { verifyAdmin } from '@/lib/dal'

// User management (invite, edit, deactivate, delete tenant employees) is
// restricted to OWNER / ADMIN / SUPER_ADMIN of the tenant — see verifyAdmin().
// Self-profile edits go through a different action (not exposed here).
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
  const { customerId } = await verifyAdmin()

  const validated = userSchema.safeParse(data)
  if (!validated.success) return { error: 'Invalid data' }

  const { address, birthDate, ...rest } = validated.data

  let token: string
  try {
    ;({ token } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          ...rest,
          tenant:        { connect: { id: customerId } },
          birthDate:     birthDate ? new Date(birthDate) : null,
          password:      null,
          emailVerified: new Date(),
          address:       buildAddressCreate(address),
        },
        select: { id: true },
      })
      const t = randomBytes(32).toString('hex')
      await tx.passwordResetToken.create({
        data: { token: hashToken(t), userId: user.id, expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) },
      })
      return { token: t }
    }))
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { error: 'This email is already in use' }
    }
    throw e
  }

  await sendWelcomeEmail(rest.email, token)

  revalidatePath('/system/users')
  return { success: 'User created successfully.' }
}

export async function updateUser(id: string, data: UserFormValues): Promise<ActionError | ActionSuccess> {
  const { customerId } = await verifyAdmin()

  const validated = userSchema.safeParse(data)
  if (!validated.success) return { error: 'Invalid data' }

  const { address, birthDate, ...rest } = validated.data

  try {
    const existing = await prisma.user.findUnique({ where: { email: rest.email }, select: { id: true } })
    if (existing && existing.id !== id) return { error: 'This email is already in use' }

    await prisma.user.update({
      where: { id, tenantId: customerId },
      data: {
        ...rest,
        birthDate: birthDate ? new Date(birthDate) : null,
        address:   buildAddressWrite(address),
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'User not found.' }
    }
    throw e
  }

  revalidatePath('/system/users')
  return { success: 'User updated successfully.' }
}

export async function deleteUser(userId: string): Promise<ActionError | void> {
  const session = await verifyAdmin()

  if (session.user!.id === userId) return { error: 'You cannot delete your own account.' }

  try {
    await prisma.user.delete({ where: { id: userId, tenantId: session.customerId } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'User not found.' }
    }
    throw e
  }

  revalidatePath('/system/users')
}

export async function toggleUserActive(userId: string): Promise<ActionError | void> {
  const session = await verifyAdmin()

  if (session.user!.id === userId) return { error: 'You cannot deactivate your own account.' }

  const user = await prisma.user.findUnique({ where: { id: userId, tenantId: session.customerId }, select: { isActive: true } })
  if (!user) return { error: 'User not found.' }

  await prisma.user.update({ where: { id: userId }, data: { isActive: !user.isActive } })
  revalidatePath('/system/users')
}

export async function resendWelcomeEmail(userId: string): Promise<ActionError | void> {
  const { customerId } = await verifyAdmin()

  const user = await prisma.user.findUnique({ where: { id: userId, tenantId: customerId }, select: { email: true, password: true } })
  if (!user) return { error: 'User not found.' }
  if (user.password) return { error: 'This user has already set their password.' }

  await prisma.passwordResetToken.deleteMany({ where: { userId } })

  const token = randomBytes(32).toString('hex')
  await prisma.passwordResetToken.create({
    data: { token: hashToken(token), userId, expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) },
  })

  await sendWelcomeEmail(user.email, token)
}
