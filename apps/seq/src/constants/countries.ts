import { COUNTRIES as CORE_COUNTRIES } from '@genealogiq/core'

// Re-exported from the shared @genealogiq/core source of truth, mapped to the
// { code, name } shape SEQ uses. Already ordered Brazil, Mexico, United States,
// then alphabetical. Stored value is the ISO code.
export const COUNTRIES: { code: string; name: string }[] = CORE_COUNTRIES.map((c) => ({
  code: c.iso,
  name: c.name,
}))
