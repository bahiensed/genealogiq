import { prisma } from "@/lib/prisma"
import type { TreeViewer } from "@/queries/family-tree"

// Fields safe to expose to ANY authenticated viewer of a profile. PII that only
// the owner/guardian may see (nationalId, phone, notes, full address) lives in
// EDIT_SELECT below and is fetched via getProfileForEdit() — never by the public
// view path. (Security M1: stop over-fetching PII for non-managers.)
const PUBLIC_SELECT = {
  id: true,
  role: true,
  isPublicProfile: true,
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
  // Pet-only (null for every other role)
  petSpecies: true,
  petBreed: true,
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
    select: { guardianId: true, status: true, guardian: { select: { firstName: true } } },
  },
} as const

// Manager-only projection: the public fields PLUS the restricted PII the edit
// form needs. Only call this behind an owner/guardian check.
const EDIT_SELECT = {
  ...PUBLIC_SELECT,
  // Restricted PII (M1) — owner/guardian only
  nationalId: true,
  email: true,
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

// Minimal structural shape redactLivingProfile actually needs — deliberately
// narrower than ProfileRow so any query projecting a living person (not just
// getProfileById's full select) can reuse this without over-selecting fields
// it doesn't otherwise want, the same convention canManageProfile already
// uses for its own minimal structural type.
export interface RedactableProfile {
  role:         string
  id:           string
  birthDate:    Date | null
  birthPlace:   string | null
  birthState:   string | null
  birthCountry: string | null
  deathDate:    Date | null
  deathPlace:   string | null
  deathState:   string | null
  deathCountry: string | null
  deathCause:   string | null
}

/**
 * Redacts a living (APP_USER) profile's exact birth/death date+place(+state,
 * +cause) to year-only for any viewer who is neither the profile's owner nor
 * an accepted guardian. Mirrors getFamilyTree()'s per-person redaction rule
 * (queries/family-tree.ts) — same TreeViewer shape, same condition — so a
 * living person shows the same coarsened data whether viewed via their own
 * profile pages, as a node in someone else's family tree, or in someone
 * else's favorites list. Memorials (APP_MEMO) and ghosts (APP_GHOST) are
 * never redacted here — this function simply doesn't fire for anything that
 * isn't APP_USER. Photo (avatarUrl) is never redacted, matching the tree.
 *
 * Deliberately broader than the tree's current redaction: also nulls
 * birthState/deathState/deathCause, which getFamilyTree doesn't even fetch
 * today. Hiding city/country but leaving state visible, or hiding when/where
 * someone died but leaving why, would be an incomplete redaction.
 */
export function redactLivingProfile<T extends RedactableProfile>(
  profile: T,
  viewer: TreeViewer,
): T & { birthYear: number | null; deathYear: number | null } {
  const isRedacted = profile.role === "APP_USER" && profile.id !== viewer.id && !viewer.canManage
  return {
    ...profile,
    birthYear:    profile.birthDate ? profile.birthDate.getUTCFullYear() : null,
    deathYear:    profile.deathDate ? profile.deathDate.getUTCFullYear() : null,
    birthDate:    isRedacted ? null : profile.birthDate,
    birthPlace:   isRedacted ? null : profile.birthPlace,
    birthState:   isRedacted ? null : profile.birthState,
    birthCountry: isRedacted ? null : profile.birthCountry,
    deathDate:    isRedacted ? null : profile.deathDate,
    deathPlace:   isRedacted ? null : profile.deathPlace,
    deathState:   isRedacted ? null : profile.deathState,
    deathCountry: isRedacted ? null : profile.deathCountry,
    deathCause:   isRedacted ? null : profile.deathCause,
  }
}
