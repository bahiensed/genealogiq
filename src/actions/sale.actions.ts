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
  licenseId: string,
  value: number,
): Promise<ActionError | ActionSuccess> {
  const { customerId, user } = await verifyTenantSession()

  // Verifica que o APP_USER pertence ao tenant
  const appUser = await prisma.appUser.findUnique({
    where:  { id: appUserId, tenantId: customerId },
    select: { id: true, email: true },
  })
  if (!appUser) return { error: 'Customer not found.' }
  if (!appUser.email) return { error: 'Customer has no email address.' }

  // Check that a license is available
  const cl = await prisma.tenantLicense.findUnique({
    where:  { tenantId_licenseId: { tenantId: customerId, licenseId } },
    select: { quantity: true },
  })
  if (!cl || cl.quantity < 1) return { error: 'No licenses available for this type.' }

  const token = randomBytes(32).toString('hex')

  try {
    await prisma.$transaction(async (tx) => {
      await tx.tenantLicense.update({
        where: { tenantId_licenseId: { tenantId: customerId, licenseId } },
        data:  { quantity: { decrement: 1 } },
      })

      await tx.appSale.create({
        data: {
          appUserId,
          licenseId,
          value,
          tenantId: customerId,
          soldById: user.id,
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
  revalidatePath('/inventory/licenses')
  return { success: 'Sale registered and access sent successfully.' }
}
