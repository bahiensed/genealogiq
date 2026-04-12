import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { addressSchema, addressDefaultValues } from './address.schema'

export const GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const
export type Gender = typeof GENDERS[number]

export const appUserSchema = z.object({
  firstName:       z.string().min(1, 'Nome é obrigatório').max(100, 'Máximo 100 caracteres'),
  lastName:        z.string().min(1, 'Sobrenome é obrigatório').max(100, 'Máximo 100 caracteres'),
  gender:          z.enum(GENDERS, { error: 'Gênero é obrigatório' }),
  birthDate:       z.string().min(1, 'Nascimento é obrigatório'),
  birthCity:       z.string().max(200).nullish(),
  birthState:      z.string().max(200).nullish(),
  birthCountry:    z.string().min(1, 'País natal é obrigatório').max(200),
  email:           z.string().email('E-mail inválido'),
  phoneCountryCode: z.string().min(1, 'DDI obrigatório'),
  phone:           z.string().min(1, 'Telefone é obrigatório'),
  categoryId:      z.string().nullish(),
  notes:           z.string().nullish(),
  isActive:        z.boolean(),
  fb:              z.string().max(500).nullish(),
  instagram:       z.string().max(500).nullish(),
  linkedin:        z.string().max(500).nullish(),
  tiktok:          z.string().max(500).nullish(),
  x:               z.string().max(500).nullish(),
  youtube:         z.string().max(500).nullish(),
  outro:           z.string().max(500).nullish(),
  website:         z.string().max(500).nullish(),
  address:         addressSchema.optional(),
})

export type AppUserFormValues = z.infer<typeof appUserSchema>

export const appUserResolver = zodResolver(appUserSchema)

export const appUserDefaultValues: AppUserFormValues = {
  firstName:        '',
  lastName:         '',
  gender:           'MALE',
  birthDate:        '',
  birthCity:        '',
  birthState:       '',
  birthCountry:     '',
  email:            '',
  phoneCountryCode: '55',
  phone:            '',
  categoryId:       '',
  notes:            '',
  isActive:         true,
  fb:               '',
  instagram:        '',
  linkedin:         '',
  tiktok:           '',
  x:                '',
  youtube:          '',
  outro:            '',
  website:          '',
  address:          addressDefaultValues,
}
