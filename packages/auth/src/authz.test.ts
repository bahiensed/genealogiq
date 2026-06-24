import { describe, it, expect, vi } from "vitest"
import { can, assertOwnership, requireOwnership, ForbiddenError, NotFoundError } from "./authz"

describe("can (cosmetic, never throws)", () => {
  it("is true only when the record matches", () => {
    expect(can({ id: "a" }, (r) => r.id === "a")).toBe(true)
    expect(can({ id: "a" }, (r) => r.id === "b")).toBe(false)
  })
  it("is false (not a throw) for null/undefined", () => {
    expect(can(null, () => true)).toBe(false)
    expect(can(undefined, () => true)).toBe(false)
  })
})

describe("assertOwnership (form-friendly)", () => {
  it("returns the record on a match", () => {
    expect(assertOwnership({ id: "a" }, (r) => r.id === "a")).toEqual({ ok: true, record: { id: "a" } })
  })
  it("returns the default error on a non-match or null", () => {
    expect(assertOwnership({ id: "a" }, (r) => r.id === "b")).toEqual({ ok: false, error: "Not authorized." })
    expect(assertOwnership(null, () => true)).toEqual({ ok: false, error: "Not authorized." })
  })
  it("honors a custom error message (e.g. SEQ's cross-tenant count)", () => {
    expect(assertOwnership(1, (c) => c === 2, "Profile not found.")).toEqual({
      ok: false,
      error: "Profile not found.",
    })
  })
})

describe("requireOwnership (404, no existence leak)", () => {
  it("returns the typed record on a match", () => {
    expect(requireOwnership({ id: "a" }, (r) => r.id === "a")).toEqual({ id: "a" })
  })
  it("throws NotFoundError when the record is missing or unowned", () => {
    expect(() => requireOwnership({ id: "a" }, (r) => r.id === "b")).toThrow(NotFoundError)
    expect(() => requireOwnership(null, () => true)).toThrow(NotFoundError)
  })
  it("uses an injected onFail (e.g. Next's notFound) when provided", () => {
    const onFail = vi.fn((): never => {
      throw new ForbiddenError()
    })
    expect(() => requireOwnership(null, () => true, { onFail })).toThrow(ForbiddenError)
    expect(onFail).toHaveBeenCalled()
  })
})

describe("error classes", () => {
  it("carry their HTTP status", () => {
    expect(new ForbiddenError().status).toBe(403)
    expect(new NotFoundError().status).toBe(404)
  })
})
