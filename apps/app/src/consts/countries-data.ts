// Re-exported from the shared @genealogiq/core source of truth. The canonical
// list is ordered Brazil, Mexico, United States, then alphabetical, and apps
// persist the ISO code.
export type { Country, ZipProvider } from "@genealogiq/core"
export {
  COUNTRIES,
  COUNTRIES as COUNTRIES_DATA,
  COUNTRY_NAMES,
  COUNTRY_BY_NAME,
  COUNTRY_BY_ISO,
  STATES_BY_ISO,
  getCountryName,
  getLocalizedCountries,
} from "@genealogiq/core"
