import { describe, it, expect, vi, afterEach } from "vitest"
import { searchWikiTreePerson, getWikiTreeProfile, WikiTreeApiError } from "./wikitree"

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("searchWikiTreePerson", () => {
  it("returns mapped results on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([
      { matches: [
        { Id: 1, Name: "Doe-1", FirstName: "Jane", LastNameAtBirth: "Smith", LastNameCurrent: "Doe", BirthDate: "1900-01-01", DeathDate: null, BirthLocation: "Springfield", Gender: "Female" },
      ] },
    ])))

    const results = await searchWikiTreePerson("Jane Doe")
    expect(results).toEqual([{
      id:              "Doe-1",
      firstName:       "Jane",
      lastNameAtBirth: "Smith",
      lastNameCurrent: "Doe",
      birthDate:       "1900-01-01",
      deathDate:       null,
      birthLocation:   "Springfield",
      gender:          "Female",
    }])
  })

  it("throws WikiTreeApiError on non-ok HTTP status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, false, 500)))
    await expect(searchWikiTreePerson("x")).rejects.toThrow(WikiTreeApiError)
  })

  it("throws WikiTreeApiError on a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")))
    await expect(searchWikiTreePerson("x")).rejects.toThrow(WikiTreeApiError)
  })

  it("throws WikiTreeApiError on a timeout/abort", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError")))
    await expect(searchWikiTreePerson("x")).rejects.toThrow(WikiTreeApiError)
  })

  it("throws WikiTreeApiError on malformed JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => { throw new Error("bad json") },
    } as unknown as Response))
    await expect(searchWikiTreePerson("x")).rejects.toThrow(WikiTreeApiError)
  })

  it("throws WikiTreeApiError on an unexpected response shape", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([{ notMatches: [] }])))
    await expect(searchWikiTreePerson("x")).rejects.toThrow(WikiTreeApiError)
  })
})

describe("getWikiTreeProfile", () => {
  it("returns a mapped profile on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([
      { person: {
        Id: 1, Name: "Doe-1", FirstName: "Jane", LastNameAtBirth: "Smith", LastNameCurrent: "Doe",
        BirthDate: "1900-01-01", DeathDate: "1980-01-01",
        BirthLocation: "Springfield", DeathLocation: "Chicago", Gender: "Female",
      } },
    ])))

    const profile = await getWikiTreeProfile("Doe-1")
    expect(profile.id).toBe("Doe-1")
    expect(profile.deathLocation).toBe("Chicago")
  })

  it("throws WikiTreeApiError on an unexpected response shape", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([{}])))
    await expect(getWikiTreeProfile("Doe-1")).rejects.toThrow(WikiTreeApiError)
  })

  it("throws WikiTreeApiError on non-ok HTTP status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, false, 404)))
    await expect(getWikiTreeProfile("Doe-1")).rejects.toThrow(WikiTreeApiError)
  })
})
