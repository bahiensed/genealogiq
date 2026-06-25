'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { z } from 'zod'
import { Prisma } from '@genealogiq/db'
import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'
import { sendAppWelcomeEmail } from '@/lib/email'
import { hashToken, done, fail, type ActionResult } from '@genealogiq/core'

// The sale price is supplied by the client form, so it must be validated
// server-side: a finite, non-negative amount within a sane upper bound. Without
// this, a tenant user could register a sale at an arbitrary/forged value.
const saleValueSchema = z.number().finite().min(0).max(1_000_000)

export async function createAppSale(
  appUserId: string,
  subscriptionId: string,
  value: number,
): Promise<ActionResult> {
  const { customerId, user } = await verifyTenantSession()
  const t = await getTranslations('Actions')

  const parsedValue = saleValueSchema.safeParse(value)
  if (!parsedValue.success) return fail(t('sale.invalidValue'))
  const saleValue = parsedValue.data

  const appUser = await prisma.appUser.findUnique({
    where:  { id: appUserId, tenantId: customerId },
    select: { id: true, email: true, firstName: true },
  })
  if (!appUser) return fail(t('sale.customerNotFound'))
  if (!appUser.email) return fail(t('sale.customerNoEmail'))

  const inventory = await prisma.qrInventory.findUnique({
    where:  { tenantId: customerId },
    select: { quantity: true },
  })
  if (!inventory || inventory.quantity < 1) return fail(t('sale.noQrAvailable'))

  const subscription = await prisma.subscription.findUnique({
    where:  { id: subscriptionId },
    select: { termLength: true },
  })
  if (!subscription) return fail(t('sale.subscriptionNotFound'))

  const currentPeriodEnd = new Date()
  currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + subscription.termLength)

  const token = randomBytes(32).toString('hex')

  try {
    await prisma.$transaction(async (tx) => {
      await tx.qrInventory.update({
        where: { tenantId: customerId },
        data:  { quantity: { decrement: 1 } },
      })

      await tx.appSale.create({
        data: {
          appUserId,
          subscriptionId,
          value:           saleValue,
          tenantId:        customerId,
          soldById:        user.id,
          status:          'active',
          currentPeriodEnd,
        },
      })

      await tx.passwordResetToken.create({
        data: {
          token: hashToken(token),
          appUserId: appUser.id,
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        },
      })
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      return fail(t('sale.registerFailed', { code: e.code }))
    }
    return fail(t('sale.unexpectedError'))
  }

  try {
    await sendAppWelcomeEmail(appUser.email, token, appUser.firstName)
  } catch {
    // Email failure doesn't roll back the sale
  }

  revalidatePath('/sales')
  revalidatePath('/inventory/digital-qr')
  return done(t('sale.created'))
}
