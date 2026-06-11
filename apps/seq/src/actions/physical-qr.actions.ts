'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { Prisma } from '@genealogiq/db'
import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'
import { sendAppWelcomeEmail } from '@/lib/email'
import { hashToken } from '@genealogiq/core'

type ActionError   = { error: string }
type ActionSuccess = { success: string }

const buyerSchema = z.string().trim().min(1, 'Buyer name is required.').max(200)
const valueSchema = z.number().finite().min(0).max(1_000_000)

function paths(genCode: string) {
  revalidatePath('/inventory/physical-qr')
  revalidatePath(`/inventory/physical-qr/${genCode}`)
}

/** Toggle the operator-set "printed" flag. */
export async function markPhysicalQrPrinted(genCode: string, printed: boolean): Promise<ActionError | void> {
  const { customerId } = await verifyTenantSession()

  const lic = await prisma.physicalQrLicense.findFirst({
    where:  { genCode, tenantId: customerId },
    select: { id: true },
  })
  if (!lic) return { error: 'QR code not found.' }

  await prisma.physicalQrLicense.update({
    where: { id: lic.id },
    data:  { printedAt: printed ? new Date() : null },
  })
  paths(genCode)
}

/** Manual write-off ("baixa") for a sale made outside the platform. */
export async function sellPhysicalQrManually(
  genCode: string,
  input:   { buyerName: string; value?: number },
): Promise<ActionError | ActionSuccess> {
  const { customerId, user } = await verifyTenantSession()

  const buyer = buyerSchema.safeParse(input.buyerName)
  if (!buyer.success) return { error: buyer.error.issues[0].message }

  let soldValue: number | null = null
  if (input.value != null) {
    const v = valueSchema.safeParse(input.value)
    if (!v.success) return { error: 'Invalid sale value.' }
    soldValue = v.data
  }

  // Atomic guard: only an AVAILABLE code can be sold — prevents double-selling.
  const res = await prisma.physicalQrLicense.updateMany({
    where: { genCode, tenantId: customerId, status: 'AVAILABLE' },
    data:  {
      status:     'SOLD',
      soldAt:     new Date(),
      soldVia:    'MANUAL',
      soldById:   user.id,
      soldToName: buyer.data,
      soldValue,
    },
  })
  if (res.count === 0) return { error: 'This code is not available for sale (already sold or activated).' }

  paths(genCode)
  return { success: 'Sale recorded (written off).' }
}

/** Platform sale: assign the code to a tenant consumer, write it off, and email APP access. */
export async function sellPhysicalQrViaPlatform(
  genCode:   string,
  appUserId: string,
  value?:    number,
): Promise<ActionError | ActionSuccess> {
  const { customerId, user } = await verifyTenantSession()

  let soldValue: number | null = null
  if (value != null) {
    const v = valueSchema.safeParse(value)
    if (!v.success) return { error: 'Invalid sale value.' }
    soldValue = v.data
  }

  const consumer = await prisma.appUser.findUnique({
    where:  { id: appUserId, tenantId: customerId },
    select: { id: true, email: true },
  })
  if (!consumer) return { error: 'Customer not found.' }
  if (!consumer.email) return { error: 'Customer has no email address.' }

  const token = randomBytes(32).toString('hex')

  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.physicalQrLicense.updateMany({
        where: { genCode, tenantId: customerId, status: 'AVAILABLE' },
        data:  {
          status:          'SOLD',
          soldAt:          new Date(),
          soldVia:         'PLATFORM',
          soldById:        user.id,
          soldToAppUserId: consumer.id,
          soldValue,
        },
      })
      if (updated.count === 0) throw new Error('NOT_AVAILABLE')

      await tx.passwordResetToken.create({
        data: {
          token:     hashToken(token),
          appUserId: consumer.id,
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        },
      })
    })
  } catch (e) {
    if (e instanceof Error && e.message === 'NOT_AVAILABLE') {
      return { error: 'This code is not available for sale (already sold or activated).' }
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      return { error: `Failed to register sale (${e.code}).` }
    }
    return { error: 'An unexpected error occurred.' }
  }

  try {
    await sendAppWelcomeEmail(consumer.email, token)
  } catch {
    // Email failure doesn't roll back the sale.
  }

  paths(genCode)
  return { success: 'Sold and access sent to the customer.' }
}

/** Reverse a write-off — only while still SOLD (not yet activated by the consumer). */
export async function undoPhysicalQrSale(genCode: string): Promise<ActionError | ActionSuccess> {
  const { customerId } = await verifyTenantSession()

  const res = await prisma.physicalQrLicense.updateMany({
    where: { genCode, tenantId: customerId, status: 'SOLD' },
    data:  {
      status:          'AVAILABLE',
      soldAt:          null,
      soldVia:         null,
      soldById:        null,
      soldToAppUserId: null,
      soldToName:      null,
      soldValue:       null,
    },
  })
  if (res.count === 0) return { error: 'This code is not in a sold state — cannot undo.' }

  paths(genCode)
  return { success: 'Sale undone — the code is available again.' }
}
