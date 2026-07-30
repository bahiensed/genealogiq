import { describe, it, expect } from "vitest"
import {
  mapWikiTreeGender,
  normalizeWikiTreeDate,
  extractWikiTreeYear,
  mapWikiTreeProfileToGhostPrefill,
} from "./wikitree-mapper"
import type { WikiTreeProfile } from "./wikitree"

describe("mapWikiTreeGender", () => {
  it("maps Male to MALE", () => {
    expect(mapWikiTreeGender("Male")).toBe("MALE")
  })

  it("maps Female to FEMALE", () => {
    expect(mapWikiTreeGender("Female")).toBe("FEMALE")
  })

  it("never guesses OTHER — unknown/blank values become null", () => {
    expect(mapWikiTreeGender("")).toBeNull()
    expect(mapWikiTreeGender(undefined)).toBeNull()
    expect(mapWikiTreeGender(null)).toBeNull()
    expect(mapWikiTreeGender("Unknown")).toBeNull()
  })
})

describe("normalizeWikiTreeDate", () => {
  it("passes through a fully specified date", () => {
    expect(normalizeWikiTreeDate("1850-03-12")).toBe("1850-03-12")
  })

  it("rejects a fully unknown date", () => {
    expect(normalizeWikiTreeDate("0000-00-00")).toBeNull()
  })

  it("rejects a year-only date (month and day unknown)", () => {
    expect(normalizeWikiTreeDate("1850-00-00")).toBeNull()
  })

  it("rejects a year+month date with unknown day", () => {
    expect(normalizeWikiTreeDate("1850-03-00")).toBeNull()
  })

  it("rejects a year+day date with unknown month (defensive)", () => {
    expect(normalizeWikiTreeDate("1850-00-12")).toBeNull()
  })

  it("handles null, undefined and empty string", () => {
    expect(normalizeWikiTreeDate(null)).toBeNull()
    expect(normalizeWikiTreeDate(undefined)).toBeNull()
    expect(normalizeWikiTreeDate("")).toBeNull()
  })

  it("rejects a malformed string", () => {
    expect(normalizeWikiTreeDate("not-a-date")).toBeNull()
  })
})

describe("extractWikiTreeYear", () => {
  it("extracts the year from a full date", () => {
    expect(extractWikiTreeYear("1850-03-12")).toBe(1850)
  })

  it("extracts the year even when month/day are unknown", () => {
    expect(extractWikiTreeYear("1850-00-00")).toBe(1850)
  })

  it("returns null for a fully unknown date", () => {
    expect(extractWikiTreeYear("0000-00-00")).toBeNull()
  })

  it("returns null for null/undefined", () => {
    expect(extractWikiTreeYear(null)).toBeNull()
    expect(extractWikiTreeYear(undefined)).toBeNull()
  })
})

describe("mapWikiTreeProfileToGhostPrefill", () => {
  const baseProfile: WikiTreeProfile = {
    id:              "Doe-123",
    firstName:       "Jane",
    lastNameAtBirth: "Smith",
    lastNameCurrent: "Doe",
    birthDate:       "1900-05-14",
    deathDate:       "1980-01-01",
    birthLocation:   "Springfield, Illinois, USA",
    deathLocation:   "Chicago, Illinois, USA",
    gender:          "Female",
  }

  it("maps a full profile end to end", () => {
    const prefill = mapWikiTreeProfileToGhostPrefill(baseProfile)
    expect(prefill).toEqual({
      firstName:  "Jane",
      lastName:   "Doe",
      maidenName: "Smith",
      gender:     "FEMALE",
      birthDate:  "1900-05-14",
      deathDate:  "1980-01-01",
      birthPlace: "Springfield, Illinois, USA",
      deathPlace: "Chicago, Illinois, USA",
      sourceUrl:  "https://www.wikitree.com/wiki/Doe-123",
    })
  })

  it("does not duplicate maidenName when it equals the current surname", () => {
    const prefill = mapWikiTreeProfileToGhostPrefill({
      ...baseProfile,
      lastNameAtBirth: "Doe",
      lastNameCurrent: "Doe",
    })
    expect(prefill.maidenName).toBeNull()
  })

  it("falls back to lastNameAtBirth when lastNameCurrent is blank", () => {
    const prefill = mapWikiTreeProfileToGhostPrefill({
      ...baseProfile,
      lastNameCurrent: "",
    })
    expect(prefill.lastName).toBe("Smith")
    expect(prefill.maidenName).toBeNull()
  })

  it("drops partial dates instead of fabricating them", () => {
    const prefill = mapWikiTreeProfileToGhostPrefill({
      ...baseProfile,
      birthDate: "1900-00-00",
      deathDate: "0000-00-00",
    })
    expect(prefill.birthDate).toBeNull()
    expect(prefill.deathDate).toBeNull()
  })

  it("handles missing location fields", () => {
    const prefill = mapWikiTreeProfileToGhostPrefill({
      ...baseProfile,
      birthLocation: null,
      deathLocation: null,
    })
    expect(prefill.birthPlace).toBeNull()
    expect(prefill.deathPlace).toBeNull()
  })

  it("truncates an overlong location to 100 characters", () => {
    const long = "A".repeat(150)
    const prefill = mapWikiTreeProfileToGhostPrefill({ ...baseProfile, birthLocation: long })
    expect(prefill.birthPlace).toHaveLength(100)
  })

  it("never guesses gender OTHER", () => {
    const prefill = mapWikiTreeProfileToGhostPrefill({ ...baseProfile, gender: "" })
    expect(prefill.gender).toBeNull()
  })
})
