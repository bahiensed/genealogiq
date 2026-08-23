'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { z } from 'zod'
import { Prisma } from '@genealogiq/db'
import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'
import { sendAppWelcomeEmail, sendGenCodeDeliveryEmail } from '@/lib/email'
import { hashToken, done, fail, type ActionResult } from '@genealogiq/core'

const buyerSchema = z.string().trim().min(1, 'Buyer name is required.').max(200)
const valueSchema = z.number().finite().min(0).max(1_000_000)

// Everything needed to reach a buyer who isn't registered yet. firstName and
// lastName are required because AppUser requires them — nothing else is.
const buyerContactSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required.').max(100),
  lastName:  z.string().trim().min(1, 'Last name is required.').max(100),
  email:     z.string().trim().toLowerCase().email('A valid email is required.'),
})

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

/**
 * Send the code to a buyer by email, writing it off in the same step.
 *
 * The buyer does NOT have to be registered first: give a name and an email and
 * the consumer record is created here. That is the whole point — requiring a
 * full customer record up front made this path heavier than the manual
 * write-off for no benefit, since everything we need to reach the buyer is the
 * email itself.
 *
 * Emails are globally unique on AppUser (partial unique index), so an address
 * already belonging to ANOTHER tenant is rejected rather than silently
 * reassigned.
 */
export async function sellGenCodeViaPlatform(
  genCode: string,
  input:   { firstName: string; lastName: string; email: string; value?: number },
): Promise<ActionResult> {
  const t = await getTranslations('Actions')
  const { customerId, user } = await verifyTenantSession()

  const parsed = buyerContactSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0].message)
  const { firstName, lastName, email } = parsed.data

  let soldValue: number | null = null
  if (input.value != null) {
    const v = valueSchema.safeParse(input.value)
    if (!v.success) return fail(t('gencode.invalidValue'))
    soldValue = v.data
  }

  const existing = await prisma.appUser.findUnique({
    where:  { email },
    select: { id: true, email: true, firstName: true, tenantId: true, password: true },
  })
  if (existing && existing.tenantId && existing.tenantId !== customerId) {
    return fail(t('gencode.emailOtherTenant'))
  }

  // A buyer who already set a password can't be onboarded with the welcome
  // email (its link creates a password) — they get the code delivered instead.
  const needsOnboarding = !existing?.password
  const token = randomBytes(32).toString('hex')

  let consumer = existing
  try {
    await prisma.$transaction(async (tx) => {
      if (!consumer) {
        consumer = await tx.appUser.create({
          data:   { firstName, lastName, email, tenantId: customerId },
          select: { id: true, email: true, firstName: true, tenantId: true, password: true },
        })
      }

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

      if (needsOnboarding) {
        await tx.passwordResetToken.create({
          data: {
            token:     hashToken(token),
            appUserId: consumer.id,
            expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
          },
        })
      }
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
    if (needsOnboarding) {
      // Deep-link the welcome email back to this physical code so the buyer lands
      // on /qr/<genCode> right after creating their password and signing in.
      await sendAppWelcomeEmail(email, token, firstName, `/qr/${genCode}`)
    } else {
      await sendGenCodeDeliveryEmail(email, genCode, consumer?.firstName ?? firstName)
    }
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
