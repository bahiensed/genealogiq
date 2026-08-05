'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { Prisma } from '@genealogiq/db'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { done, fail, type ActionResult } from '@genealogiq/core'
import { verifyAdmin } from '@/lib/dal'
import { getExtraUnitPriceSchema, type ExtraUnitPriceFormValues } from '@/schemas/extra-unit-price.schema'
import { identityTranslator } from '@/schemas/i18n'

function toDecimalOrNull(value: number): Prisma.Decimal | null {
  return value > 0 ? new Prisma.Decimal(value) : null
}

function decimalChanged(current: Prisma.Decimal | null, next: Prisma.Decimal | null): boolean {
  if (current === null) return next !== null
  return next === null || !current.equals(next)
}

export async function updateExtraUnitPrice(id: string, data: ExtraUnitPriceFormValues): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const validated = getExtraUnitPriceSchema(identityTranslator).safeParse(data)
  if (!validated.success) return fail(t('common.invalidData'))

  const newPrices = {
    priceUsd: toDecimalOrNull(validated.data.priceUsd),
    priceBrl: toDecimalOrNull(validated.data.priceBrl),
    priceMxn: toDecimalOrNull(validated.data.priceMxn),
  }

  const current = await prisma.extraUnitPrice.findUnique({
    where:  { id },
    select: {
      priceUsd: true, priceBrl: true, priceMxn: true,
      stripePriceIdUsd: true, stripePriceIdBrl: true, stripePriceIdMxn: true,
    },
  })
  if (!current) return fail(t('extraUnitPrice.notFound'))

  // Each currency's Stripe Price (immutable) is cleared independently when
  // ITS price changes — editing BRL must never invalidate an already-good
  // USD/MXN Price, same pattern as Subscription's updateSubscription.
  let clearPatch: Record<string, null> = {}
  let clearedAny = false
  if (decimalChanged(current.priceUsd, newPrices.priceUsd) && current.stripePriceIdUsd) {
    clearPatch = { ...clearPatch, stripePriceIdUsd: null }
    clearedAny = true
  }
  if (decimalChanged(current.priceBrl, newPrices.priceBrl) && current.stripePriceIdBrl) {
    clearPatch = { ...clearPatch, stripePriceIdBrl: null }
    clearedAny = true
  }
  if (decimalChanged(current.priceMxn, newPrices.priceMxn) && current.stripePriceIdMxn) {
    clearPatch = { ...clearPatch, stripePriceIdMxn: null }
    clearedAny = true
  }

  await prisma.extraUnitPrice.update({ where: { id }, data: { ...newPrices, ...clearPatch } })

  revalidatePath('/extra-unit-prices')
  return done(clearedAny ? t('extraUnitPrice.updatedStripeCleared') : t('extraUnitPrice.updated'))
}

// Ensures a one-time Stripe Price exists for one currency, creating it if
// missing. Skipped entirely if this currency isn't configured (price
// null/0) — a row can be partially synced (USD live, BRL/MXN not set up
// yet) without failing the whole sync. Unlike Subscription's Prices, these
// have no `recurring` block — omitting it is what makes a Price one-time.
async function ensureOneTimeCurrencyPrice(
  productId: string,
  label: string,
  currency: 'usd' | 'brl' | 'mxn',
  price: Prisma.Decimal | null,
  existingId: string | null,
): Promise<string | null> {
  if (price === null || Number(price) <= 0) return existingId
  if (existingId) return existingId

  const p = await stripe.prices.create({
    product:     productId,
    unit_amount: Math.round(Number(price) * 100),
    currency,
    nickname:    `${label} ${currency}`,
  })
  return p.id
}

// Push the saved row's data to Stripe: create/update the Product and, for
// each configured currency, create whichever one-time Price is missing.
// Mirrors Subscription's syncSubscriptionWithStripe, minus the annual/
// monthly split — these are single one-time Prices per currency.
export async function syncExtraUnitPriceWithStripe(id: string): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const row = await prisma.extraUnitPrice.findUnique({ where: { id } })
  if (!row) return fail(t('extraUnitPrice.notFound'))

  const hasAnyPrice = [row.priceUsd, row.priceBrl, row.priceMxn].some((p) => p !== null && Number(p) > 0)
  if (!hasAnyPrice) return fail(t('extraUnitPrice.priceRequired'))

  const label = `${row.resource} extra (${row.tier})`

  try {
    let productId = row.stripeProductId
    if (productId) {
      await stripe.products.update(productId, { name: label })
    } else {
      const product = await stripe.products.create({
        name:     label,
        metadata: { extraUnitPriceId: row.id, resource: row.resource, tier: row.tier },
      })
      productId = product.id
    }

    const usdId = await ensureOneTimeCurrencyPrice(productId, label, 'usd', row.priceUsd, row.stripePriceIdUsd)
    const brlId = await ensureOneTimeCurrencyPrice(productId, label, 'brl', row.priceBrl, row.stripePriceIdBrl)
    const mxnId = await ensureOneTimeCurrencyPrice(productId, label, 'mxn', row.priceMxn, row.stripePriceIdMxn)

    await prisma.extraUnitPrice.update({
      where: { id: row.id },
      data: {
        stripeProductId:  productId,
        stripePriceIdUsd: usdId,
        stripePriceIdBrl: brlId,
        stripePriceIdMxn: mxnId,
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : t('extraUnitPrice.unknownError')
    return fail(t('extraUnitPrice.stripeSyncFailed', { message }))
  }

  revalidatePath('/extra-unit-prices')
  return done(t('extraUnitPrice.synced'))
}
