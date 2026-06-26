// BR/intl document & contact masks + the CPF/CNPJ validators are single-sourced
// in @genealogiq/core (so the security-relevant validators can't drift between
// apps). The currency masks below are specific to this app.
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

export function maskCurrency(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (!digits) return ''
  const cents = digits.padStart(3, '0')
  const intPart = parseInt(cents.slice(0, -2), 10).toLocaleString('en-US')
  const decPart = cents.slice(-2)
  return `${intPart}.${decPart}`
}

export function parseCurrencyDigits(digits: string): number {
  return parseInt(digits || '0', 10) / 100
}
