'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'
import { sendAppWelcomeEmail } from '@/lib/email'

type ActionError   = { error: string }
type ActionSuccess = { success: string }

export async function createAppSale(
  appUserId: string,
  subscriptionId: string,
  value: number,
): Promise<ActionError | ActionSuccess> {
  const { customerId, user } = await verifyTenantSession()

  const appUser = await prisma.appUser.findUnique({
    where:  { id: appUserId, tenantId: customerId },
    select: { id: true, email: true },
  })
  if (!appUser) return { error: 'Customer not found.' }
  if (!appUser.email) return { error: 'Customer has no email address.' }

  const inventory = await prisma.qrInventory.findUnique({
    where:  { tenantId: customerId },
    select: { quantity: true },
  })
  if (!inventory || inventory.quantity < 1) return { error: 'No QR codes available.' }

  const subscription = await prisma.subscription.findUnique({
    where:  { id: subscriptionId },
    select: { termLength: true },
  })
  if (!subscription) return { error: 'Subscription not found.' }

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
          value,
          tenantId:        customerId,
          soldById:        user.id,
          status:          'active',
          currentPeriodEnd,
        },
      })

      await tx.passwordResetToken.create({
        data: {
          token,
          appUserId: appUser.id,
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        },
      })
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      return { error: `Failed to register sale (${e.code}).` }
    }
    return { error: 'An unexpected error occurred.' }
  }

  try {
    await sendAppWelcomeEmail(appUser.email, token)
  } catch {
    // Email failure doesn't roll back the sale
  }

  revalidatePath('/sales')
  revalidatePath('/inventory/packages')
  return { success: 'Sale registered and access sent successfully.' }
}
