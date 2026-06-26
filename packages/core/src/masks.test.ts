import { describe, it, expect } from "vitest"
import { validateCpf, validateCnpj, maskCpf, maskCnpj, unmaskDigits } from "./masks"

describe("validateCpf", () => {
  it("accepts a valid CPF, masked or raw", () => {
    expect(validateCpf("529.982.247-25")).toBe(true)
    expect(validateCpf("52998224725")).toBe(true)
  })
  it("rejects wrong checksum, wrong length, and repeated digits", () => {
    expect(validateCpf("529.982.247-24")).toBe(false)
    expect(validateCpf("123")).toBe(false)
    expect(validateCpf("111.111.111-11")).toBe(false)
  })
})

describe("validateCnpj", () => {
  it("accepts a valid CNPJ, masked or raw", () => {
    expect(validateCnpj("11.222.333/0001-81")).toBe(true)
    expect(validateCnpj("11222333000181")).toBe(true)
  })
  it("rejects wrong checksum, wrong length, and repeated digits", () => {
    expect(validateCnpj("11.222.333/0001-80")).toBe(false)
    expect(validateCnpj("123")).toBe(false)
    expect(validateCnpj("11.111.111/1111-11")).toBe(false)
  })
})

describe("masks", () => {
  it("formats CPF/CNPJ and strips non-digits", () => {
    expect(maskCpf("52998224725")).toBe("529.982.247-25")
    expect(maskCnpj("11222333000181")).toBe("11.222.333/0001-81")
    expect(unmaskDigits("529.982.247-25")).toBe("52998224725")
  })
})
