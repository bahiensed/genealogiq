export interface ZipResult {
  zip: string
  street: string
  neighborhood: string
  city: string
  state: string
  country: string
}

async function lookupBrazilianCep(cep: string): Promise<ZipResult> {
  const digits = cep.replace(/\D/g, '')
  if (digits.length !== 8) throw new Error('CEP inválido')

  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
  if (!res.ok) throw new Error('Erro ao consultar CEP')

  const data = await res.json()
  if (data.erro) throw new Error('CEP não encontrado')

  return {
    zip:          digits,
    street:       data.logradouro ?? '',
    neighborhood: data.bairro     ?? '',
    city:         data.localidade ?? '',
    state:        data.uf         ?? '',
    country:      'BR',
  }
}

async function lookupZippopotam(countryCode: string, zip: string): Promise<ZipResult> {
  const res = await fetch(`https://api.zippopotam.us/${countryCode.toLowerCase()}/${zip}`)
  if (!res.ok) throw new Error('ZIP not found')

  const data = await res.json()
  const place = data.places?.[0]
  if (!place) throw new Error('ZIP not found')

  return {
    zip:          zip,
    street:       '',
    neighborhood: '',
    city:         place['place name']         ?? '',
    state:        place['state abbreviation'] ?? '',
    country:      countryCode,
  }
}

export async function lookupZip(countryCode: string, zip: string): Promise<ZipResult> {
  if (countryCode === 'BR') return lookupBrazilianCep(zip)
  return lookupZippopotam(countryCode, zip)
}
