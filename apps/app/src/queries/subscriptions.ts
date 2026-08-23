import "server-only"

import { resolveLocale } from "@genealogiq/i18n/server"
import { prisma } from "@/lib/prisma"
import { LOCALE_TO_CURRENCY, resolveCurrency, pricesForCurrency } from "@/lib/currency"

export async function getActiveSubscriptions() {
  const viewerCurrency = LOCALE_TO_CURRENCY[await resolveLocale()]

  const rows = await prisma.subscription.findMany({
    // Self-serve checkout only ever offers the plans this app actually sells
    // this way — a physical-QR license or any other admin-created row is
    // sold/tracked through a different channel, not this page.
    where: { isActive: true, code: { in: ["FREE", "PREMIUM"] } },
    select: {
      id:                    true,
      code:                  true,
      name:                  true,
      description:           true,
      maxProfiles:           true,
      termLength:            true,
      priceUsd:              true,
      monthlyPriceUsd:       true,
      priceBrl:              true,
      monthlyPriceBrl:       true,
      priceMxn:              true,
      monthlyPriceMxn:       true,
      treeMaxMembers:        true,
      bioMaxChars:           true,
      mediaMaxImages:        true,
      mediaMaxVideos:        true,
      documentsMax:          true,
      geoPlacesMax:          true,
      memorialsMax:          true,
      petsMax:               true,
      qrCodeMax:             true,
    },
  })

  const resolved = rows.map((r) => {
    const fields = {
      priceUsd:        Number(r.priceUsd),
      monthlyPriceUsd: r.monthlyPriceUsd ? Number(r.monthlyPriceUsd) : null,
      priceBrl:        r.priceBrl ? Number(r.priceBrl) : null,
      monthlyPriceBrl: r.monthlyPriceBrl ? Number(r.monthlyPriceBrl) : null,
      priceMxn:        r.priceMxn ? Number(r.priceMxn) : null,
      monthlyPriceMxn: r.monthlyPriceMxn ? Number(r.monthlyPriceMxn) : null,
    }
    const currency = resolveCurrency(fields, viewerCurrency)
    const { price, monthlyPrice } = pricesForCurrency(fields, currency)

    return {
      id:          r.id,
      code:        r.code,
      name:        r.name,
      description: r.description,
      maxProfiles: r.maxProfiles,
      termLength:  r.termLength,
      price,
      monthlyPrice,
      currency,
      quotas: {
        code:                  r.code,
        treeMaxMembers:        r.treeMaxMembers,
        bioMaxChars:           r.bioMaxChars,
        mediaMaxImages:        r.mediaMaxImages,
        mediaMaxVideos:        r.mediaMaxVideos,
        documentsMax:          r.documentsMax,
        geoPlacesMax:          r.geoPlacesMax,
        memorialsMax:          r.memorialsMax,
        petsMax:               r.petsMax,
        qrCodeMax:             r.qrCodeMax,
      },
    }
  })

  // Sort in code, not via Prisma's orderBy: with independent per-currency
  // prices, USD tier-order isn't guaranteed to match BRL/MXN order once a
  // 3rd paid plan exists — sort by whatever's actually being shown.
  return resolved.sort((a, b) => a.price - b.price)
}

export type SubscriptionRow = Awaited<ReturnType<typeof getActiveSubscriptions>>[number]
