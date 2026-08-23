import { describe, it, expect } from "vitest"
import { redactLivingProfile, type ProfileRow } from "./profile"

// Mirrors family-tree.test.ts's livingRow fixture — same redaction rule,
// same shape of evidence (year survives, photo is never touched).
const livingRow = (over: Partial<ProfileRow> = {}): ProfileRow => ({
  id: "LIVING",
  role: "APP_USER",
  isPublicProfile: true,
  firstName: "f",
  lastName: "l",
  maidenName: null,
  nickname: null,
  gender: null,
  avatarUrl: "https://x/y.jpg",
  birthDate: new Date("1990-05-15T00:00:00.000Z"),
  birthPlace: "Rio",
  birthState: "RJ",
  birthCountry: "BR",
  deathDate: null,
  deathPlace: null,
  deathState: null,
  deathCountry: null,
  deathCause: null,
  petSpecies: null,
  petBreed: null,
  website: null,
  instagram: null,
  linkedin: null,
  fb: null,
  x: null,
  tiktok: null,
  youtube: null,
  otherSocial: null,
  genCode: null,
  guardedBy: [],
  ...over,
})

describe("redactLivingProfile", () => {
  it("redacts exact birth/death date+place+state+cause for a stranger viewer", () => {
    const redacted = redactLivingProfile(livingRow(), { id: "some-stranger", canManage: false })

    expect(redacted.birthDate).toBeNull()
    expect(redacted.birthPlace).toBeNull()
    expect(redacted.birthState).toBeNull()
    expect(redacted.birthCountry).toBeNull()
    expect(redacted.deathDate).toBeNull()
    expect(redacted.deathPlace).toBeNull()
    expect(redacted.deathState).toBeNull()
    expect(redacted.deathCountry).toBeNull()
    expect(redacted.deathCause).toBeNull()
  })

  it("redacts for an anonymous viewer (id null)", () => {
    const redacted = redactLivingProfile(livingRow(), { id: null, canManage: false })
    expect(redacted.birthDate).toBeNull()
  })

  it("derives birthYear/deathYear before redacting, and they survive redaction", () => {
    const redacted = redactLivingProfile(
      livingRow({ deathDate: new Date("2020-01-01T00:00:00.000Z") }),
      { id: null, canManage: false },
    )
    expect(redacted.birthYear).toBe(1990)
    expect(redacted.deathYear).toBe(2020)
  })

  it("never redacts the photo", () => {
    const redacted = redactLivingProfile(livingRow(), { id: null, canManage: false })
    expect(redacted.avatarUrl).toBe("https://x/y.jpg")
  })

  it("does not redact when the viewer is the profile owner", () => {
    const redacted = redactLivingProfile(livingRow({ id: "LIVING" }), { id: "LIVING", canManage: false })
    expect(redacted.birthDate).not.toBeNull()
    expect(redacted.birthPlace).toBe("Rio")
  })

  it("does not redact when the viewer manages the profile", () => {
    const redacted = redactLivingProfile(livingRow(), { id: "manager-id", canManage: true })
    expect(redacted.birthDate).not.toBeNull()
    expect(redacted.deathCause).toBe(null) // was already null in the fixture — not a redaction artifact
  })

  it("never redacts a memorial, regardless of viewer", () => {
    const redacted = redactLivingProfile(
      livingRow({ role: "APP_MEMO", birthPlace: "Rio" }),
      { id: null, canManage: false },
    )
    expect(redacted.birthDate).not.toBeNull()
    expect(redacted.birthPlace).toBe("Rio")
  })

  it("never redacts a ghost, regardless of viewer", () => {
    const redacted = redactLivingProfile(
      livingRow({ role: "APP_GHOST", birthPlace: "Rio" }),
      { id: null, canManage: false },
    )
    expect(redacted.birthPlace).toBe("Rio")
  })

  it("returns birthYear/deathYear as null when there's no date to derive from", () => {
    const redacted = redactLivingProfile(
      livingRow({ birthDate: null, deathDate: null }),
      { id: null, canManage: false },
    )
    expect(redacted.birthYear).toBeNull()
    expect(redacted.deathYear).toBeNull()
  })
})
