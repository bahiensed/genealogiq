// The APP's own quota numbers, independent of the shared Subscription table
// (BMS/SEQ's Package/Subscription admin still exists and still decides whether
// a profile is paying at all, via a live AppSale — see getMemorialFeatures in
// subscription.ts — but the actual feature NUMBERS below no longer come from
// that table's columns. BMS can rename/reprice/retire its own Subscription
// rows without ever touching these numbers again.)

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
  geoPlacesMax: 4,
  memorialsMax: 2,
  qrCodeMax: 2,
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
  memorialsMax: 6,
  qrCodeMax: 2,
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
  qrCodeMax: 20,
  geolocationFullAccess: true,
}

// Which fields allow buying one more unit individually — a property of the
// MODULE, not of the tier (true regardless of FREE/PREMIUM/PHYSICAL_QR). The
// actual purchase mechanism doesn't exist yet; LimitReachedDialog only reads
// this to decide whether to mention it as an option alongside upgrading.
export const ALLOWS_EXTRA_PURCHASE: Partial<Record<keyof PlanQuotas, true>> = {
  geoPlacesMax: true,
  qrCodeMax: true,
  memorialsMax: true,
}
