import { describe, it, expect } from "vitest"
import {
  PUSH_COPY,
  buildPushPayload,
  normalizePushLocale,
  shouldPruneSubscription,
} from "./push-payload"
import { SUPPORTED_LOCALES } from "@genealogiq/i18n"

const ALL_TYPES = [
  "TRIBUTE_PENDING",
  "TRIBUTE_APPROVED",
  "TRIBUTE_REJECTED",
  "FAMILY_REQUEST_PENDING",
  "FAMILY_REQUEST_ACCEPTED",
  "FAMILY_REQUEST_REJECTED",
  "GUARDIAN_REQUEST_PENDING",
  "GUARDIAN_REQUEST_ACCEPTED",
  "GUARDIAN_REQUEST_REJECTED",
] as const

describe("PUSH_COPY", () => {
  it("has non-empty title and body for all 9 types in all 3 locales", () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const type of ALL_TYPES) {
        const copy = PUSH_COPY[locale][type]
        expect(copy.title.length, `${locale}/${type} title`).toBeGreaterThan(0)
        expect(copy.body.length, `${locale}/${type} body`).toBeGreaterThan(0)
      }
    }
  })
})

describe("normalizePushLocale", () => {
  it("passes supported locales through", () => {
    expect(normalizePushLocale("pt-BR")).toBe("pt-BR")
    expect(normalizePushLocale("es-MX")).toBe("es-MX")
    expect(normalizePushLocale("en-US")).toBe("en-US")
  })

  it("falls back to en-US for null, undefined and unknown values", () => {
    expect(normalizePushLocale(null)).toBe("en-US")
    expect(normalizePushLocale(undefined)).toBe("en-US")
    expect(normalizePushLocale("fr-FR")).toBe("en-US")
    expect(normalizePushLocale("")).toBe("en-US")
  })
})

describe("buildPushPayload", () => {
  it("builds a localized payload with an entity-scoped tag", () => {
    const payload = buildPushPayload({
      type: "TRIBUTE_PENDING",
      locale: "pt-BR",
      url: "/messages",
      entityId: "trib-1",
    })
    expect(payload).toEqual({
      title: PUSH_COPY["pt-BR"].TRIBUTE_PENDING.title,
      body: PUSH_COPY["pt-BR"].TRIBUTE_PENDING.body,
      url: "/messages",
      tag: "giq:TRIBUTE_PENDING:trib-1",
    })
  })

  it("uses a generic tag suffix when no entity id exists", () => {
    const payload = buildPushPayload({
      type: "GUARDIAN_REQUEST_REJECTED",
      locale: null,
      url: "/messages",
      entityId: null,
    })
    expect(payload.tag).toBe("giq:GUARDIAN_REQUEST_REJECTED:general")
    expect(payload.title).toBe(PUSH_COPY["en-US"].GUARDIAN_REQUEST_REJECTED.title)
  })
})

describe("shouldPruneSubscription", () => {
  it("prunes on 404 and 410", () => {
    expect(shouldPruneSubscription(404)).toBe(true)
    expect(shouldPruneSubscription(410)).toBe(true)
  })

  it("keeps the subscription on other statuses and undefined", () => {
    for (const code of [400, 401, 403, 413, 429, 500, undefined]) {
      expect(shouldPruneSubscription(code), String(code)).toBe(false)
    }
  })
})
