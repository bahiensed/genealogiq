'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { Prisma } from '@genealogiq/db'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { done, fail, type ActionResult } from '@genealogiq/core'
import { verifyAdmin } from '@/lib/dal'
import { getSubscriptionSchema, type SubscriptionFormValues } from '@/schemas/subscription.schema'
import { identityTranslator } from '@/schemas/i18n'
import { decidePriceOp } from '@/lib/price-book'
import { syncSubscriptionPrices } from '@genealogiq/services/plan-sync'

/**
 * The consumer plans now share the partner plans' versioned price book.
 *
 * They used to keep their own price_usd / monthly_price_brl columns, which
 * carried exactly the defect plan_prices was built to fix: editing an amount is
 * an UPDATE, so it rewrites what every past sale was charged. Two ways of
 * pricing in one system, only one of them honest.
 *
 * The reconciliation below is the same `decidePriceOp` the partner plans use.
 * One rule, one place: a changed amount closes the live row and opens the next
 * version beside it.
 */
const CURRENCIES = [
  { code: 'USD', country: null, price: 'priceUsd', monthly: 'monthlyPriceUsd' },
  { code: 'BRL', country: 'BR', price: 'priceBrl', monthly: 'monthlyPriceBrl' },
  { code: 'MXN', country: 'MX', price: 'priceMxn', monthly: 'monthlyPriceMxn' },
] as const

/**
 * One price-book row from the form's per-currency fields.
 *
 * The monthly amount is MATERIALISED when the form leaves it empty, because the
 * old sync derived it as price/termLength and a plan priced annually always
 * offered a monthly option too. The book reads a null instalment as "not
 * offered", so carrying the null across would silently remove monthly billing.
 */
function priceRowFor(v: SubscriptionFormValues, c: (typeof CURRENCIES)[number]) {
  const annual = v[c.price]
  if (annual <= 0) return null
  const monthly = v[c.monthly]
  return {
    currency:          c.code,
    countryScope:      c.country,
    annualCashAmount:  annual,
    installmentCount:  v.termLength > 0 ? v.termLength : null,
    installmentAmount: monthly > 0
      ? monthly
      : v.termLength > 0 ? Math.round((annual / v.termLength) * 100) / 100 : null,
    unitReferenceAmount: null,
    effectiveFrom:     new Date(),
  }
}

export async function createSubscription(data: SubscriptionFormValues): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const validated = getSubscriptionSchema(identityTranslator).safeParse(data)
  if (!validated.success) return fail(t('common.invalidData'))

  const v = validated.data
  const { priceUsd, monthlyPriceUsd, priceBrl, monthlyPriceBrl, priceMxn, monthlyPriceMxn, ...rest } = v

  await prisma.$transaction(async (tx) => {
    const plan = await tx.subscription.create({ data: rest, select: { id: true } })
    const rows = CURRENCIES.map((c) => priceRowFor(v, c))
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .map((r) => ({ ...r, subscriptionId: plan.id }))
    if (rows.length) await tx.planPrice.createMany({ data: rows })
  })

  revalidatePath('/subscriptions')
  return done(t('subscription.created'))
}

export async function updateSubscription(id: string, data: SubscriptionFormValues): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const validated = getSubscriptionSchema(identityTranslator).safeParse(data)
  if (!validated.success) return fail(t('common.invalidData'))

  const v = validated.data
  const { priceUsd, monthlyPriceUsd, priceBrl, monthlyPriceBrl, priceMxn, monthlyPriceMxn, ...rest } = v

  const current = await prisma.subscription.findUnique({
    where:  { id },
    select: { termLength: true },
  })
  if (!current) return fail(t('subscription.notFound'))

  const live = await prisma.planPrice.findMany({
    where:  { subscriptionId: id, isActive: true, effectiveTo: null },
    select: {
      id: true, currency: true, version: true,
      annualCashAmount: true, installmentCount: true, installmentAmount: true, unitReferenceAmount: true,
      stripeCashPriceId: true, stripeInstallmentPriceId: true,
    },
  })

  // termLength feeds every currency's annual Price math (interval_count), so
  // changing it supersedes all three currencies, not only the one edited.
  const termChanged = current.termLength !== rest.termLength

  const now = new Date()
  const superseded: string[] = []

  try {
    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({ where: { id }, data: rest })

      for (const c of CURRENCIES) {
        const wanted   = priceRowFor(v, c)
        const existing = live.find((p) => p.currency === c.code)

        const op = decidePriceOp(
          existing && {
            version:             existing.version,
            annualCashAmount:    Number(existing.annualCashAmount),
            installmentCount:    existing.installmentCount,
            installmentAmount:   existing.installmentAmount === null ? null : Number(existing.installmentAmount),
            unitReferenceAmount: existing.unitReferenceAmount === null ? null : Number(existing.unitReferenceAmount),
          },
          wanted,
        )

        const mustSupersede = op.kind === 'supersede' || (termChanged && op.kind === 'keep' && !!existing)
        if (op.kind === 'absent') continue
        if (op.kind === 'keep' && !mustSupersede) continue

        if (existing && (op.kind === 'close' || mustSupersede)) {
          await tx.planPrice.update({
            where: { id: existing.id },
            data:  { effectiveTo: now, isActive: false },
          })
          if (existing.stripeCashPriceId)        superseded.push(existing.stripeCashPriceId)
          if (existing.stripeInstallmentPriceId) superseded.push(existing.stripeInstallmentPriceId)
        }

        if (op.kind === 'open') {
          await tx.planPrice.create({ data: { ...wanted!, subscriptionId: id } })
        } else if (mustSupersede) {
          await tx.planPrice.create({
            data: { ...wanted!, subscriptionId: id, version: (existing?.version ?? 0) + 1 },
          })
        }
      }
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return fail(t('subscription.notFound'))
    }
    throw e
  }

  // Best-effort, outside the transaction: a Stripe Price left live after its DB
  // row closed is purchasable through a link nobody can trace back. A Stripe
  // hiccup must not undo a price edit that already landed.
  if (superseded.length > 0) {
    await Promise.allSettled(superseded.map((priceId) => stripe.prices.update(priceId, { active: false })))
  }

  revalidatePath('/subscriptions')
  return done(superseded.length ? t('subscription.updatedStripeCleared') : t('subscription.updated'))
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

/**
 * Pushes the plan's price book to Stripe.
 *
 * Delegates to the shared syncer rather than keeping its own copy: consumer and
 * partner plans now read from one book, and two syncers over one book would be
 * two chances to mint a Price the other side cannot find.
 */
export async function syncSubscriptionWithStripe(id: string): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const plan = await prisma.subscription.findUnique({
    where:  { id },
    select: { termLength: true },
  })
  if (!plan) return fail(t('subscription.notFound'))
  // termLength is every cash Price's interval_count — a 0 ("lifetime") plan is
  // not recurring and cannot be synced as-is.
  if (plan.termLength <= 0) return fail(t('subscription.termLengthRequired'))

  try {
    await syncSubscriptionPrices(id)
  } catch (e) {
    const message = e instanceof Error ? e.message : t('subscription.unknownError')
    return fail(t('subscription.stripeSyncFailed', { message }))
  }

  revalidatePath('/subscriptions')
  return done(t('subscription.synced'))
}
