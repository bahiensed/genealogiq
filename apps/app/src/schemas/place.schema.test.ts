import { describe, it, expect } from "vitest"
import { identityTranslator } from "@genealogiq/core"
import { getPlaceSchema } from "./place.schema"

const schema = getPlaceSchema(identityTranslator)

const base = {
  title: "Childhood home",
  description: "Where it all began.",
  categories: ["birth", "childhood_home"],
  address: { country: "BR", city: "Rio" },
  lat: -22.9,
  lon: -43.1,
  photos: [] as string[],
  startDate: null,
  endDate: null,
}

describe("getPlaceSchema", () => {
  it("accepts a valid place", () => {
    expect(schema.safeParse(base).success).toBe(true)
  })

  it("requires a title", () => {
    expect(schema.safeParse({ ...base, title: "" }).success).toBe(false)
  })

  it("rejects unknown category keys", () => {
    expect(schema.safeParse({ ...base, categories: ["not_a_real_category"] }).success).toBe(false)
  })

  it("accepts an empty category list", () => {
    expect(schema.safeParse({ ...base, categories: [] }).success).toBe(true)
  })

  it("rejects an out-of-range latitude", () => {
    expect(schema.safeParse({ ...base, lat: 120 }).success).toBe(false)
  })

  it("rejects a non-blob photo URL", () => {
    expect(schema.safeParse({ ...base, photos: ["https://evil.example.com/x.jpg"] }).success).toBe(false)
  })

  it("accepts a valid Vercel Blob photo URL", () => {
    const r = schema.safeParse({
      ...base,
      photos: ["https://qa.public.blob.vercel-storage.com/a.jpg"],
    })
    expect(r.success).toBe(true)
  })

  it("rejects an end date before the start date", () => {
    const r = schema.safeParse({ ...base, startDate: "2020-06-01", endDate: "2019-01-01" })
    expect(r.success).toBe(false)
  })

  it("accepts an end date on or after the start date", () => {
    const r = schema.safeParse({ ...base, startDate: "2019-01-01", endDate: "2020-06-01" })
    expect(r.success).toBe(true)
  })
})
