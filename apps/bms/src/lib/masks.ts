// BR/intl document & contact masks + the CPF/CNPJ validators are single-sourced
// in @genealogiq/core (so the security-relevant validators can't drift between
// apps). The masks below are specific to this app.
export {
  unmaskDigits,
  maskCpf,
  maskCnpj,
  maskTaxId,
  maskPhone,
  maskUsZip,
  maskMxZip,
  maskCep,
  validateCpf,
  validateCnpj,
} from '@genealogiq/core'

import { unmaskDigits, maskPhone } from '@genealogiq/core'

export function maskUsdAmount(digits: string, locale = 'en-US'): string {
  if (!digits) return ''
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseInt(digits, 10) / 100)
}

export function maskPhoneMX(value: string): string {
  // Mexico: 10 digits → (XXX) XXX-XXXX
  const digits = unmaskDigits(value).slice(0, 10)
  return digits
    .replace(/(\d{3})(\d)/, '($1) $2')
    .replace(/(\d{3})(\d{1,4})$/, '$1-$2')
}

export function maskPhoneUS(value: string): string {
  // USA: 10 digits → (XXX) XXX-XXXX
  const digits = unmaskDigits(value).slice(0, 10)
  return digits
    .replace(/(\d{3})(\d)/, '($1) $2')
    .replace(/(\d{3})(\d{1,4})$/, '$1-$2')
}

export function maskPhoneByCountry(value: string, countryCode: string): string {
  if (countryCode === '52') return maskPhoneMX(value)
  if (countryCode === '1')  return maskPhoneUS(value)
  return maskPhone(value)
}
