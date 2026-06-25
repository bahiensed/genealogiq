import { z } from 'zod'
import type { Translator } from './i18n'
import { addressSchema, addressDefaultValues } from './address.schema'

// Self-profile schema: subset of user.schema covering only fields a user can
// safely edit for themselves. role/email/isActive/tenantId are handled by
// admin flows or dedicated dialogs (ChangeEmailDialog).
export function getProfileSchema(t: Translator) {
  return z.object({
    firstName:        z.string().min(2, t('minChars', { count: 2 })),
    lastName:         z.string().min(2, t('minChars', { count: 2 })),
    nationalId:       z.string().nullish(),
    birthDate:        z.string().nullish(),
    phoneCountryCode: z.string().min(1, t('countryCodeRequired')),
    phone:            z.string().nullish(),
    address:          addressSchema.optional(),
  })
}

export type ProfileFormValues = z.infer<ReturnType<typeof getProfileSchema>>

export const profileDefaultValues: ProfileFormValues = {
  firstName:        '',
  lastName:         '',
  nationalId:       '',
  birthDate:        '',
  phoneCountryCode: '55',
  phone:            '',
  address:          addressDefaultValues,
}
