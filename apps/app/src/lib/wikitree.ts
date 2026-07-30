const BASE_URL = "https://api.wikitree.com/api.php"
const TIMEOUT_MS = 5000
const SEARCH_LIMIT = 10

// WikiTree treats unidentified requests as anonymous/bot traffic and subjects
// them to strict rate limiting (or an outright block) — appId is a
// self-chosen identifier (no registration required) that avoids that.
// USER_AGENT follows the same courtesy convention as the Wikimedia APIs.
const APP_ID = "Genealogiq"
const USER_AGENT = `Genealogiq/1.0 (${process.env.APP_URL ?? "https://genealogiq.app"})`

const SEARCH_FIELDS = "Id,Name,FirstName,LastNameAtBirth,LastNameCurrent,BirthDate,DeathDate,BirthLocation,Gender"
const PROFILE_FIELDS = `${SEARCH_FIELDS},DeathLocation`

export class WikiTreeApiError extends Error {}

export interface WikiTreeSearchResult {
  id: string
  firstName: string
  lastNameAtBirth: string
  lastNameCurrent: string
  birthDate: string | null
  deathDate: string | null
  birthLocation: string | null
  gender: string | null
}

export interface WikiTreeProfile extends WikiTreeSearchResult {
  deathLocation: string | null
}

interface RawWikiTreePerson {
  Id?: number | string
  Name?: string
  FirstName?: string
  LastNameAtBirth?: string
  LastNameCurrent?: string
  BirthDate?: string
  DeathDate?: string
  BirthLocation?: string
  DeathLocation?: string
  Gender?: string
}

function toResult(p: RawWikiTreePerson): WikiTreeSearchResult {
  return {
    id:              String(p.Name ?? p.Id ?? ""),
    firstName:       p.FirstName ?? "",
    lastNameAtBirth: p.LastNameAtBirth ?? "",
    lastNameCurrent: p.LastNameCurrent ?? "",
    birthDate:       p.BirthDate ?? null,
    deathDate:       p.DeathDate ?? null,
    birthLocation:   p.BirthLocation ?? null,
    gender:          p.Gender ?? null,
  }
}

async function callWikiTree(params: Record<string, string>): Promise<unknown> {
  const url = new URL(BASE_URL)
  url.searchParams.set("appId", APP_ID)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  let res: Response
  try {
    res = await fetch(url, {
      signal:  AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": USER_AGENT },
    })
  } catch {
    throw new WikiTreeApiError("WikiTree request failed")
  }
  if (!res.ok) throw new WikiTreeApiError(`WikiTree responded with status ${res.status}`)

  try {
    return await res.json()
  } catch {
    throw new WikiTreeApiError("WikiTree returned malformed JSON")
  }
}

export async function searchWikiTreePerson(query: string): Promise<WikiTreeSearchResult[]> {
  // searchPerson has no generic free-text "Query" param — RealName matches
  // against the person's full name, which fits a single search box best.
  const data = await callWikiTree({
    action:   "searchPerson",
    RealName: query,
    fields:   SEARCH_FIELDS,
    limit:    String(SEARCH_LIMIT),
  })

  const matches = Array.isArray(data) ? data[0]?.matches : undefined
  if (!Array.isArray(matches)) throw new WikiTreeApiError("Unexpected WikiTree search response shape")

  return (matches as RawWikiTreePerson[]).map(toResult)
}

export async function getWikiTreeProfile(wikiTreeId: string): Promise<WikiTreeProfile> {
  const data = await callWikiTree({
    action: "getProfile",
    key:    wikiTreeId,
    fields: PROFILE_FIELDS,
  })

  const entry = Array.isArray(data) ? data[0] : undefined
  const person: RawWikiTreePerson | undefined = entry?.person
  if (!person) throw new WikiTreeApiError("Unexpected WikiTree profile response shape")

  return {
    ...toResult(person),
    deathLocation: person.DeathLocation ?? null,
  }
}
