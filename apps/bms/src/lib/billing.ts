import 'server-only'

import { randomBytes } from 'crypto'
import { hashToken } from '@genealogiq/core'
import { prisma } from '@/lib/prisma'
import { sendSequoiaWelcomeEmail } from '@/lib/email'
import { CHECKOUT_ORIGINS } from '@genealogiq/services/partner-checkout'

/**
 * What is left of BMS's billing once the batch-of-codes model went away.
 *
 * Minting, settling and reversing a Sale all lived here. They are gone with the
 * table: a partner no longer buys stock, they subscribe, and the cycle that
 * grants their allowance is opened by @genealogiq/services/partner-billing off
 * a paid invoice.
 *
 * Opening Sequoia stayed, because it is the one thing only BMS does — a partner
 * who bought through an emailed link may never have signed in, so the first
 * payment is what grants them access.
 */

/** Matches the window createCustomer used to mint before access was payment-gated. */
const RESET_TOKEN_TTL_MS = 72 * 60 * 60 * 1000

/** Checkout Sessions BMS opens carry this, so both webhooks know whose they are. */
export const BMS_ORIGIN = CHECKOUT_ORIGINS.bms

/**
 * Opens Sequoia to a partner that has now paid for something.
 *
 * createCustomer writes the owner inactive, with no token and no email: a
 * customer who never buys must not get a login. This is the other half — it runs
 * on the first settled payment and does what registration used to do eagerly.
 *
 * Idempotent, and that matters more than it looks. It runs on EVERY payment, not
 * just the first, and a partner who renews must not have their password reset
 * out from under them. An already-active owner is left alone.
 */
export async function provisionTenantAccess(tenantId: string): Promise<void> {
  const owner = await prisma.user.findFirst({
    where:  { tenantId, role: 'OWNER' },
    select: { id: true, email: true, isActive: true },
  })
  // A tenant with no owner row is a data problem, not a payment problem — the
  // money is already in and the cycle is already open, so failing here would
  // only make the webhook retry a fulfilment that succeeded.
  if (!owner) {
    console.error('[bms-billing] paid tenant has no OWNER user', { tenantId })
    return
  }
  if (owner.isActive) return

  const token = randomBytes(32).toString('hex')

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: owner.id }, data: { isActive: true } })
    await tx.passwordResetToken.deleteMany({ where: { userId: owner.id } })
    await tx.passwordResetToken.create({
      data: {
        token:     hashToken(token),
        userId:    owner.id,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    })
  })

  await sendSequoiaWelcomeEmail(owner.email, token)
}
