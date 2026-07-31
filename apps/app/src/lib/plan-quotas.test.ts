import { describe, it, expect } from "vitest"
import { allowsExtraPurchase } from "./plan-quotas"

describe("allowsExtraPurchase", () => {
  it("allows buying extras for geo places, memorials and QR codes", () => {
    expect(allowsExtraPurchase("geoPlacesMax")).toBe(true)
    expect(allowsExtraPurchase("memorialsMax")).toBe(true)
    expect(allowsExtraPurchase("qrCodeMax")).toBe(true)
  })

  it("never allows buying extra pets", () => {
    expect(allowsExtraPurchase("petsMax")).toBe(false)
  })

  it("has no purchase concept for fields without a purchasable unit", () => {
    expect(allowsExtraPurchase("treeMaxMembers")).toBe(false)
    expect(allowsExtraPurchase("bioMaxChars")).toBe(false)
    expect(allowsExtraPurchase("documentsMax")).toBe(false)
    expect(allowsExtraPurchase("mediaMaxImages")).toBe(false)
    expect(allowsExtraPurchase("mediaMaxVideos")).toBe(false)
  })
})
