import { prisma } from "@/lib/prisma"

// Fields safe to expose to ANY authenticated viewer of a profile. PII that only
// the owner/guardian may see (nationalId, phone, notes, full address) lives in
// EDIT_SELECT below and is fetched via getProfileForEdit() — never by the public
// view path. (Security M1: stop over-fetching PII for non-managers.)
const PUBLIC_SELECT = {
  id: true,
  role: true,
  // Identity
  firstName: true,
  lastName: true,
  maidenName: true,
  nickname: true,
  gender: true,
  avatarUrl: true,
  // Birth
  birthDate: true,
  birthPlace: true,
  birthState: true,
  birthCountry: true,
  // Death
  deathDate: true,
  deathPlace: true,
  deathState: true,
  deathCountry: true,
  deathCause: true,
  // Social (self-published handles)
  website: true,
  instagram: true,
  linkedin: true,
  fb: true,
  x: true,
  tiktok: true,
  youtube: true,
  otherSocial: true,
  // Relations needed for display + canManageProfile()
  appSaleId: true,
  physicalQrLicense: { select: { id: true } },
  guardedBy: {
    where:  { status: "ACCEPTED" as const },
    select: { guardianId: true, status: true },
  },
} as const

// Manager-only projection: the public fields PLUS the restricted PII the edit
// form needs. Only call this behind an owner/guardian check.
const EDIT_SELECT = {
  ...PUBLIC_SELECT,
  // Restricted PII (M1) — owner/guardian only
  nationalId: true,
  phone: true,
  phoneCountryCode: true,
  notes: true,
  address: {
    select: {
      id: true,
      zip: true,
      street: true,
      number: true,
      complement: true,
      neighborhood: true,
      city: true,
      state: true,
      country: true,
    },
  },
} as const

/** Public profile projection — no restricted PII. Safe for any viewer. */
export async function getProfileById(id: string) {
  return prisma.appUser.findUnique({
    where: { id },
    select: PUBLIC_SELECT,
  })
}

/**
 * Full profile projection including restricted PII (nationalId, phone, notes,
 * address). MUST only be called after confirming the caller can manage the
 * profile (owner or ACCEPTED guardian). Used by the edit page.
 */
export async function getProfileForEdit(id: string) {
  return prisma.appUser.findUnique({
    where: { id },
    select: EDIT_SELECT,
  })
}

export type ProfileRow = NonNullable<Awaited<ReturnType<typeof getProfileById>>>
export type EditProfileRow = NonNullable<Awaited<ReturnType<typeof getProfileForEdit>>>
