export const PHONE_COUNTRY_CODES = [
  { code: '55', label: '+55  Brazil'  },
  { code: '52', label: '+52  Mexico'  },
  { code: '1',  label: ' +1  USA'     },
] as const

export type PhoneCountryCode = typeof PHONE_COUNTRY_CODES[number]['code']
