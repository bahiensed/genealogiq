// The APP's own quota numbers, independent of the shared Subscription table
// (BMS/SEQ's Package/Subscription admin still exists and still decides whether
// a profile is paying at all, via a live AppSale — see getMemorialFeatures in
// subscription.ts — but the actual feature NUMBERS below no longer come from
// that table's columns. BMS can rename/reprice/retire its own Subscription
// rows without ever touching these numbers again.)
//
// As of the FREE.petsMax=0/product-table quota alignment, src/queries/
// subscriptions.ts sources the /subscriptions pricing page's feature bullets
// from FREE/PREMIUM/PHYSICAL_QR below (keyed by Subscription.code) instead of
// the DB columns — Subscription's own treeMaxMembers/bioMaxChars/bioMaxImages/
// galleryMaxImages/galleryMaxVideos/qrCodeAccess columns are now unread
// anywhere in apps/app (BMS still lets an admin edit them; that's a cross-app
// cleanup out of scope here).
//
// KNOWN PENDING (flagged, not implemented): the product table now prices
// PREMIUM in both USD and BRL (e.g. $2.99/mo + R$14.90/mo), and the price
// itself changed from the previous $3.99/mo·$39.99/yr. Neither PlanQuotas nor
// this file model price at all — checkout price/currency lives entirely on
// the shared Subscription row (BMS-owned) via Stripe Price objects, and
// multi-currency checkout is a real structural change (locale-aware Stripe
// Prices, currency selection at checkout) that hasn't been scoped yet. Do not
// assume it's covered by anything here — it's a separate future task.

export type PlanTier = "FREE" | "PREMIUM" | "PHYSICAL_QR"

export interface PlanQuotas {
  code: PlanTier
  treeMaxMembers: number
  // "tokens" in the pricing table is just this app's way of expressing the
  // bio's text-length quota — not an AI feature (that's future roadmap). 1
  // token == 1 character here, same as the char-count this already was.
  bioMaxChars: number
  // Combined pool: Bio images + Gallery images + GeoPlace photos (Memoriais/
  // Pets don't contribute their own — see the per-profile note in
  // queries/media-usage.ts).
  mediaMaxImages: number
  // Combined pool: Gallery videos only today (Bio/GeoPlace have no video field).
  mediaMaxVideos: number
  documentsMax: number
  // Row count of GeoPlace — independent of mediaMaxImages, which caps photos
  // WITHIN those rows, not how many rows exist.
  geoPlacesMax: number
  // How many memorial profiles a guardian may create.
  memorialsMax: number
  // How many pet profiles a guardian may create — same numbers as
  // memorialsMax, kept as a separate counter since pets are a distinct
  // resource (don't share the memorial pool).
  petsMax: number
  // How many QR codes (own profile + guarded memorials, combined) are free.
  qrCodeMax: number
  // Unchanged — boolean feature of the singular Geolocation model, out of
  // scope for this redesign.
  geolocationFullAccess: boolean
}

export const FREE: PlanQuotas = {
  code: "FREE",
  treeMaxMembers: 32,
  bioMaxChars: 2048,
  mediaMaxImages: 32,
  mediaMaxVideos: 8,
  documentsMax: 16,
  geoPlacesMax: 3,
  memorialsMax: 1,
  // Pets are a PREMIUM-only feature (not just a smaller free quota) — 0 blocks
  // creation entirely via the existing count < limit check, no extra code path.
  petsMax: 0,
  qrCodeMax: 1,
  geolocationFullAccess: false,
}

export const PREMIUM: PlanQuotas = {
  code: "PREMIUM",
  treeMaxMembers: 512,
  bioMaxChars: 8192,
  mediaMaxImages: 1024,
  mediaMaxVideos: 32,
  documentsMax: 64,
  geoPlacesMax: 6,
  memorialsMax: 5,
  petsMax: 5,
  qrCodeMax: 1,
  geolocationFullAccess: true,
}

// The pre-existing "physical QR" product tier (a printed cemetery marker
// license, sold separately from the monthly/annual subscription) — kept as
// the ceiling above PREMIUM, same role PHYSICAL_QR_FEATURES played before.
export const PHYSICAL_QR: PlanQuotas = {
  code: "PHYSICAL_QR",
  treeMaxMembers: 1024,
  bioMaxChars: 20000,
  mediaMaxImages: 2048,
  mediaMaxVideos: 64,
  documentsMax: 128,
  geoPlacesMax: 50,
  memorialsMax: 20,
  petsMax: 20,
  qrCodeMax: 20,
  geolocationFullAccess: true,
}

// Whether one more unit of `field` can be purchased individually — a
// property of the module (geo places/memorials/QR codes are purchasable at
// EITHER tier, just at a different price per tier, not modeled here; pets
// and everything else have no purchase concept at all). The actual purchase
// mechanism doesn't exist yet; LimitReachedDialog only reads this to decide
// whether to mention it as an option alongside upgrading.
export function allowsExtraPurchase(field: keyof PlanQuotas): boolean {
  switch (field) {
    case "geoPlacesMax":
    case "memorialsMax":
    case "qrCodeMax":
      return true
    default:
      return false
  }
}
