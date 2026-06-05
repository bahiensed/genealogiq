export function maskUsdAmount(digits: string): string {
  if (!digits) return ''
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseInt(digits, 10) / 100)
}

export function unmaskDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export function maskCpf(value: string): string {
  const digits = unmaskDigits(value).slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function maskCnpj(value: string): string {
  const digits = unmaskDigits(value).slice(0, 14)
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

export function maskTaxId(value: string): string {
  const digits = unmaskDigits(value)
  if (digits.length <= 11) return maskCpf(digits)
  return maskCnpj(digits)
}

export function maskPhone(value: string): string {
  const digits = unmaskDigits(value).slice(0, 11)
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2')
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}

export function maskUsZip(value: string): string {
  const digits = unmaskDigits(value).slice(0, 9)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export function maskMxZip(value: string): string {
  return unmaskDigits(value).slice(0, 5)
}

export function maskCep(value: string): string {
  const digits = unmaskDigits(value).slice(0, 8)
  return digits.replace(/(\d{5})(\d{1,3})$/, '$1-$2')
}

export function validateCpf(cpf: string): boolean {
  const digits = unmaskDigits(cpf)
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i)
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(digits[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i)
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  return remainder === parseInt(digits[10])
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

export function validateCnpj(cnpj: string): boolean {
  const digits = unmaskDigits(cnpj)
  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false
  const calc = (d: string, weights: number[]) =>
    weights.reduce((acc, w, i) => acc + parseInt(d[i]) * w, 0)
  const mod = (n: number) => {
    const r = n % 11
    return r < 2 ? 0 : 11 - r
  }
  const d1 = mod(calc(digits, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]))
  const d2 = mod(calc(digits, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]))
  return d1 === parseInt(digits[12]) && d2 === parseInt(digits[13])
}
