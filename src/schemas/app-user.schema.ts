import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { addressSchema, addressDefaultValues } from './address.schema'

export const GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const
export type Gender = typeof GENDERS[number]
export const GENDER_OPTIONS = ['FEMALE', 'MALE'] as const

export const appUserSchema = z.object({
  firstName:       z.string().min(1, 'Required').max(100, 'Must be at most 100 characters'),
  lastName:        z.string().min(1, 'Required').max(100, 'Must be at most 100 characters'),
  gender:          z.enum(GENDERS).nullish(),
  birthDate:       z.string().min(1, 'Required'),
  birthCity:       z.string().max(200).nullish(),
  birthState:      z.string().max(200).nullish(),
  birthCountry:    z.string().min(1, 'Required').max(200),
  email:           z.string().email('Invalid email address'),
  phoneCountryCode: z.string().min(1, 'Country code is required'),
  phone:           z.string().min(1, 'Required'),
  categoryId:      z.string().nullish(),
  notes:           z.string().nullish(),
  isActive:        z.boolean(),
  fb:              z.string().max(500).nullish(),
  instagram:       z.string().max(500).nullish(),
  linkedin:        z.string().max(500).nullish(),
  tiktok:          z.string().max(500).nullish(),
  x:               z.string().max(500).nullish(),
  youtube:         z.string().max(500).nullish(),
  otherSocial:           z.string().max(500).nullish(),
  website:         z.string().max(500).nullish(),
  address:         addressSchema.optional(),
})

export type AppUserFormValues = z.infer<typeof appUserSchema>

export const appUserResolver = zodResolver(appUserSchema)

export const appUserDefaultValues: AppUserFormValues = {
  firstName:        '',
  lastName:         '',
  gender:           null,
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
  otherSocial:            '',
  website:          '',
  address:          addressDefaultValues,
}
