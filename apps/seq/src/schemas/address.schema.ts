import { z } from 'zod'

export const addressSchema = z.object({
  zip:          z.string().nullish(),
  street:       z.string().nullish(),
  number:       z.string().nullish(),
  complement:   z.string().nullish(),
  neighborhood: z.string().nullish(),
  city:         z.string().nullish(),
  state:        z.string().nullish(),
  country:      z.string().nullish(),
})

export type AddressFormValues = z.infer<typeof addressSchema>

export const addressDefaultValues: AddressFormValues = {
  zip:          '',
  street:       '',
  number:       '',
  complement:   '',
  neighborhood: '',
  city:         '',
  state:        '',
  country:      'BR',
}
