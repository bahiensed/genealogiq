import { describe, it, expect } from "vitest"
import { validateCpf, validateCnpj, maskTaxId, maskPhoneByCountry, unmaskDigits } from "./masks"

describe("validateCpf", () => {
  it("accepts a valid CPF, formatted or raw", () => {
    expect(validateCpf("529.982.247-25")).toBe(true)
    expect(validateCpf("52998224725")).toBe(true)
  })
  it("rejects a wrong check digit", () => {
    expect(validateCpf("52998224724")).toBe(false)
  })
  it("rejects all-equal digits and the wrong length", () => {
    expect(validateCpf("11111111111")).toBe(false)
    expect(validateCpf("123")).toBe(false)
  })
})

describe("validateCnpj", () => {
  it("accepts a valid CNPJ, formatted or raw", () => {
    expect(validateCnpj("11.222.333/0001-81")).toBe(true)
    expect(validateCnpj("11222333000181")).toBe(true)
  })
  it("rejects a wrong check digit, all-equal digits, and the wrong length", () => {
    expect(validateCnpj("11222333000182")).toBe(false)
    expect(validateCnpj("11111111111111")).toBe(false)
    expect(validateCnpj("123")).toBe(false)
  })
})

describe("maskTaxId", () => {
  it("formats <=11 digits as CPF and >11 as CNPJ", () => {
    expect(maskTaxId("52998224725")).toBe("529.982.247-25")
    expect(maskTaxId("11222333000181")).toBe("11.222.333/0001-81")
  })
})

describe("maskPhoneByCountry", () => {
  it("dispatches by country code (52 → MX, 1 → US, default → BR)", () => {
    expect(maskPhoneByCountry("5551234567", "52")).toBe("(555) 123-4567")
    expect(maskPhoneByCountry("5551234567", "1")).toBe("(555) 123-4567")
    expect(maskPhoneByCountry("11987654321", "55")).toBe("(11) 98765-4321")
  })
})

describe("unmaskDigits", () => {
  it("strips every non-digit character", () => {
    expect(unmaskDigits("(11) 98765-4321")).toBe("11987654321")
  })
})
