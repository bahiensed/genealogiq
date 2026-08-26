import { describe, it, expect } from "vitest"
import { LOCALE_DISPLAY_ORDER } from "@genealogiq/i18n"
import { CURRENCY_DISPLAY_ORDER, CURRENCY_CODE_ORDER, byCurrencyDisplayOrder } from "./currency"
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

describe("currency display order", () => {
  // The rule the founder set: money follows the interface. If someone reorders
  // the language switcher and this stops matching, that is the bug — not this
  // test being fussy.
  it("follows the language switcher exactly", () => {
    expect(CURRENCY_DISPLAY_ORDER).toEqual(LOCALE_DISPLAY_ORDER.map(currencyForLocale))
  })

  it("reads United States, Mexico, Brazil today", () => {
    expect(CURRENCY_CODE_ORDER).toEqual(["USD", "MXN", "BRL"])
  })

  it("sorts rows into that order whatever order they arrive in", () => {
    const rows = [{ currency: "BRL" }, { currency: "USD" }, { currency: "MXN" }]
    expect(rows.sort(byCurrencyDisplayOrder).map((r) => r.currency)).toEqual(["USD", "MXN", "BRL"])
  })

  // A row priced in something we do not sell must not lead the list it is in.
  it("sorts an unknown currency last", () => {
    const rows = [{ currency: "EUR" }, { currency: "BRL" }, { currency: "USD" }]
    expect(rows.sort(byCurrencyDisplayOrder).map((r) => r.currency)).toEqual(["USD", "BRL", "EUR"])
  })
})
