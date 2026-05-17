import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { addressSchema, addressDefaultValues } from './address.schema'

// Self-profile schema: subset of user.schema covering only fields a user can
// safely edit for themselves. role/email/isActive/tenantId are handled by
// admin flows or dedicated dialogs (ChangeEmailDialog).
export const profileSchema = z.object({
  firstName:        z.string().min(2, 'Must be at least 2 characters'),
  lastName:         z.string().min(2, 'Must be at least 2 characters'),
  nationalId:       z.string().nullish(),
  birthDate:        z.string().nullish(),
  phoneCountryCode: z.string().min(1, 'Country code is required'),
  phone:            z.string().nullish(),
  address:          addressSchema.optional(),
})

export type ProfileFormValues = z.infer<typeof profileSchema>

export const profileResolver = zodResolver(profileSchema)

export const profileDefaultValues: ProfileFormValues = {
  firstName:        '',
  lastName:         '',
  nationalId:       '',
  birthDate:        '',
  phoneCountryCode: '55',
  phone:            '',
  address:          addressDefaultValues,
}
