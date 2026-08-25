import { describe, it, expect } from "vitest"
import { currencyForLocale, currencyCode, APP_CURRENCIES } from "./currency"

describe("currencyForLocale", () => {
  it("maps the three app locales", () => {
    expect(currencyForLocale("pt-BR")).toBe("brl")
    expect(currencyForLocale("en-US")).toBe("usd")
    expect(currencyForLocale("es-MX")).toBe("mxn")
  })

  // next-intl can hand back a bare language tag, and a viewer's browser can send
  // a regional variant we never configured.
  it("resolves by language when the region is unfamiliar", () => {
    expect(currencyForLocale("pt")).toBe("brl")
    expect(currencyForLocale("pt-PT")).toBe("brl")
    expect(currencyForLocale("es")).toBe("mxn")
    expect(currencyForLocale("es-AR")).toBe("mxn")
    expect(currencyForLocale("en-GB")).toBe("usd")
  })

  // USD is the only currency every catalogue row historically had.
  it("falls back to usd for anything else", () => {
    expect(currencyForLocale("de-DE")).toBe("usd")
    expect(currencyForLocale("")).toBe("usd")
  })

  it("returns a currency that is actually in the supported set", () => {
    for (const l of ["pt-BR", "en-US", "es-MX", "ja-JP"]) {
      expect(APP_CURRENCIES).toContain(currencyForLocale(l))
    }
  })
})

describe("currencyCode", () => {
  it("uppercases for Intl and Stripe", () => {
    expect(currencyCode("brl")).toBe("BRL")
  })
})
