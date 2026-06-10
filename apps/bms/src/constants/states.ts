import { STATES_BY_ISO } from '@genealogiq/core'

// Re-exported from the shared @genealogiq/core source of truth. Keyed by ISO
// country code (BR/US/MX have states; others resolve to an empty list).
export const STATES_BY_COUNTRY: Record<string, { code: string; name: string }[]> = STATES_BY_ISO
