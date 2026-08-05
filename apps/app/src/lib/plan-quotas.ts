// Per-plan quota numbers now live on the shared Subscription table (BMS can
// edit every plan attribute manually, no code deploy needed) — see
// getMemorialFeatures in subscription.ts, which reads them off the live
// Subscription row instead of a hardcoded constant. This file only keeps
// what's NOT admin-editable per plan: the PlanQuotas shape itself, the
// PHYSICAL_QR ceiling (a printed cemetery-marker license, resolved via a
// separate PhysicalQrLicense→Package link, unrelated to Subscription rows),
// and the purchase-extra policy.

// Free-text — Subscription.code is admin-typed in BMS, not a closed enum.
export type PlanTier = string

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

// The pre-existing "physical QR" product tier (a printed cemetery marker
// license, sold separately from the monthly/annual subscription) — kept as
// the ceiling above PREMIUM. Resolved via PhysicalQrLicense→Package, not a
// Subscription row, so it stays hardcoded — BMS has nothing to edit here.
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

// Whether one more unit of `field` can be purchased individually. Geo places
// and QR codes are purchasable at either tier (just a different price per
// tier — see ExtraUnitPrice, packages/db). Memorials are PREMIUM-only: a
// FREE guardian has no way to buy an extra memorial slot, only to upgrade —
// deliberate, matches ExtraUnitPrice having no MEMORIAL+FREE row. Pets and
// everything else have no purchase concept at all.
export function allowsExtraPurchase(field: keyof PlanQuotas, tier?: PlanTier): boolean {
  switch (field) {
    case "geoPlacesMax":
    case "qrCodeMax":
      return true
    case "memorialsMax":
      return tier !== "FREE"
    default:
      return false
  }
}
