import { COUNTRY_BY_ISO } from "@/consts/countries-data"

export interface ZipResult {
  zip: string
  street: string
  neighborhood: string
  city: string
  state: string
  country: string
}

async function lookupBrazilianCep(cep: string, iso: string): Promise<ZipResult> {
  const digits = cep.replace(/\D/g, "")
  if (digits.length !== 8) throw new Error("CEP inválido")

  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
  if (!res.ok) throw new Error("Erro ao consultar CEP")

  const data = await res.json()
  if (data.erro) throw new Error("CEP não encontrado")

  return {
    zip:          digits,
    street:       data.logradouro ?? "",
    neighborhood: data.bairro     ?? "",
    city:         data.localidade ?? "",
    state:        data.uf         ?? "",
    country:      iso,
  }
}

async function lookupZippopotam(iso: string, zip: string): Promise<ZipResult> {
  const res = await fetch(`https://api.zippopotam.us/${iso.toLowerCase()}/${zip}`)
  if (!res.ok) throw new Error("ZIP not found")

  const data = await res.json()
  const place = data.places?.[0]
  if (!place) throw new Error("ZIP not found")

  return {
    zip,
    street:       "",
    neighborhood: "",
    city:         place["place name"]         ?? "",
    state:        place["state abbreviation"] ?? "",
    country:      iso,
  }
}

export async function lookupZip(iso: string, zip: string): Promise<ZipResult> {
  const c = COUNTRY_BY_ISO[iso]
  if (!c?.zipProvider) throw new Error("ZIP lookup not supported for this country")
  if (c.zipProvider === "viacep") return lookupBrazilianCep(zip, c.iso)
  return lookupZippopotam(c.iso, zip)
}
