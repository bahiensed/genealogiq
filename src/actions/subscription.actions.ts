'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/dal'
import { subscriptionSchema, type SubscriptionFormValues } from '@/schemas/subscription.schema'

type ActionError   = { error: string }
type ActionSuccess = { success: string }

export async function createSubscription(data: SubscriptionFormValues): Promise<ActionError | ActionSuccess> {
  await verifyAdmin()

  const validated = subscriptionSchema.safeParse(data)
  if (!validated.success) return { error: 'Invalid data' }

  const { price, ...rest } = validated.data
  await prisma.subscription.create({ data: { ...rest, price: new Prisma.Decimal(price) } })

  revalidatePath('/subscriptions')
  return { success: 'Subscription created successfully.' }
}

export async function updateSubscription(id: string, data: SubscriptionFormValues): Promise<ActionError | ActionSuccess> {
  await verifyAdmin()

  const validated = subscriptionSchema.safeParse(data)
  if (!validated.success) return { error: 'Invalid data' }

  const { price, ...rest } = validated.data

  try {
    await prisma.subscription.update({ where: { id }, data: { ...rest, price: new Prisma.Decimal(price) } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return { error: 'Subscription not found.' }
    }
    throw e
  }

  revalidatePath('/subscriptions')
  return { success: 'Subscription updated successfully.' }
}

export async function deleteSubscription(id: string): Promise<ActionError | void> {
  await verifyAdmin()

  try {
    await prisma.subscription.delete({ where: { id } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2025') return { error: 'Subscription not found.' }
      if (e.code === 'P2003') return { error: 'Cannot delete this subscription — it is linked to existing sales records.' }
    }
    throw e
  }

  revalidatePath('/subscriptions')
}

export async function toggleSubscriptionActive(id: string): Promise<ActionError | void> {
  await verifyAdmin()

  const subscription = await prisma.subscription.findUnique({ where: { id }, select: { isActive: true } })
  if (!subscription) return { error: 'Subscription not found.' }

  await prisma.subscription.update({ where: { id }, data: { isActive: !subscription.isActive } })
  revalidatePath('/subscriptions')
}
