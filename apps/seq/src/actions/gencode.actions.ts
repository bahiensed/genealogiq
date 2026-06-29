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

const buyerSchema = z.string().trim().min(1, 'Buyer name is required.').max(200)
const valueSchema = z.number().finite().min(0).max(1_000_000)

function paths(genCode: string) {
  revalidatePath('/inventory/gencodes')
  revalidatePath(`/inventory/gencodes/${genCode}`)
}

/** Toggle the operator-set "printed" flag. */
export async function markGenCodePrinted(genCode: string, printed: boolean): Promise<ActionResult> {
  const t = await getTranslations('Actions')
  const { customerId } = await verifyTenantSession()

  const lic = await prisma.physicalQrLicense.findFirst({
    where:  { genCode, tenantId: customerId },
    select: { id: true },
  })
  if (!lic) return fail(t('gencode.notFound'))

  await prisma.physicalQrLicense.update({
    where: { id: lic.id },
    data:  { printedAt: printed ? new Date() : null },
  })
  paths(genCode)
  return done()
}

/** Manual write-off ("baixa") for a sale made outside the platform. */
export async function sellGenCodeManually(
  genCode: string,
  input:   { buyerName: string; value?: number },
): Promise<ActionResult> {
  const t = await getTranslations('Actions')
  const { customerId, user } = await verifyTenantSession()

  const buyer = buyerSchema.safeParse(input.buyerName)
  if (!buyer.success) return fail(t('common.invalidData'))

  let soldValue: number | null = null
  if (input.value != null) {
    const v = valueSchema.safeParse(input.value)
    if (!v.success) return fail(t('gencode.invalidValue'))
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
  if (res.count === 0) return fail(t('gencode.notAvailable'))

  paths(genCode)
  return done(t('gencode.saleRecorded'))
}

/** Platform sale: assign the code to a tenant consumer, write it off, and email APP access. */
export async function sellGenCodeViaPlatform(
  genCode:   string,
  appUserId: string,
  value?:    number,
): Promise<ActionResult> {
  const t = await getTranslations('Actions')
  const { customerId, user } = await verifyTenantSession()

  let soldValue: number | null = null
  if (value != null) {
    const v = valueSchema.safeParse(value)
    if (!v.success) return fail(t('gencode.invalidValue'))
    soldValue = v.data
  }

  const consumer = await prisma.appUser.findUnique({
    where:  { id: appUserId, tenantId: customerId },
    select: { id: true, email: true, firstName: true },
  })
  if (!consumer) return fail(t('gencode.customerNotFound'))
  if (!consumer.email) return fail(t('gencode.customerNoEmail'))

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
      return fail(t('gencode.notAvailable'))
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      return fail(t('gencode.saleFailed', { code: e.code }))
    }
    return fail(t('gencode.unexpectedError'))
  }

  try {
    // Deep-link the welcome email back to this physical code so the buyer lands
    // on /qr/<genCode> right after creating their password and signing in.
    await sendAppWelcomeEmail(consumer.email, token, consumer.firstName, `/qr/${genCode}`)
  } catch {
    // Email failure doesn't roll back the sale.
  }

  paths(genCode)
  return done(t('gencode.soldViaPlatform'))
}

/** Reverse a write-off — only while still SOLD (not yet activated by the consumer). */
export async function undoGenCodeSale(genCode: string): Promise<ActionResult> {
  const t = await getTranslations('Actions')
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
  if (res.count === 0) return fail(t('gencode.notSold'))

  paths(genCode)
  return done(t('gencode.saleUndone'))
}
