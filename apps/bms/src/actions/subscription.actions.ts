'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { Prisma } from '@genealogiq/db'
import { prisma } from '@/lib/prisma'
import { done, fail, type ActionResult } from '@genealogiq/core'
import { verifyAdmin } from '@/lib/dal'
import { getSubscriptionSchema, type SubscriptionFormValues } from '@/schemas/subscription.schema'
import { identityTranslator } from '@/schemas/i18n'

export async function createSubscription(data: SubscriptionFormValues): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const validated = getSubscriptionSchema(identityTranslator).safeParse(data)
  if (!validated.success) return fail(t('common.invalidData'))

  const { price, ...rest } = validated.data
  await prisma.subscription.create({ data: { ...rest, price: new Prisma.Decimal(price) } })

  revalidatePath('/subscriptions')
  return done(t('subscription.created'))
}

export async function updateSubscription(id: string, data: SubscriptionFormValues): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const validated = getSubscriptionSchema(identityTranslator).safeParse(data)
  if (!validated.success) return fail(t('common.invalidData'))

  const { price, ...rest } = validated.data

  try {
    await prisma.subscription.update({ where: { id }, data: { ...rest, price: new Prisma.Decimal(price) } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return fail(t('subscription.notFound'))
    }
    throw e
  }

  revalidatePath('/subscriptions')
  return done(t('subscription.updated'))
}

export async function deleteSubscription(id: string): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  try {
    await prisma.subscription.delete({ where: { id } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2025') return fail(t('subscription.notFound'))
      if (e.code === 'P2003') return fail(t('subscription.hasSales'))
    }
    throw e
  }

  revalidatePath('/subscriptions')
  return done()
}

export async function toggleSubscriptionActive(id: string): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const subscription = await prisma.subscription.findUnique({ where: { id }, select: { isActive: true } })
  if (!subscription) return fail(t('subscription.notFound'))

  await prisma.subscription.update({ where: { id }, data: { isActive: !subscription.isActive } })
  revalidatePath('/subscriptions')
  return done()
}
