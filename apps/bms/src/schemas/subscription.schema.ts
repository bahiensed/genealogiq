import { z } from 'zod'
import type { Translator } from './i18n'

export function getSubscriptionSchema(t: Translator) {
  return z.object({
    code:        z.string()
      .min(2, t('minChars', { count: 2 }))
      .max(32, t('maxChars', { count: 32 }))
      .regex(/^[A-Z0-9_]+$/, t('codeFormat')),
    name:        z.string()
      .min(4, t('minChars', { count: 4 }))
      .max(64, t('maxChars', { count: 64 })),
    description: z.string().max(256, t('maxChars', { count: 256 })).optional(),
    isActive:    z.boolean(),

    // Commercial
    maxProfiles: z.number().int(t('mustBeWholeNumber')).positive(t('mustBePositive')),
    termLength:  z.number().int(t('mustBeWholeNumber')).min(0, t('termLengthMin')),
    price:       z.number().min(0, t('priceMin')),

    // Feature limits
    treeMaxMembers:   z.number().int(t('mustBeWholeNumber')).min(0, t('mustBeZeroOrGreater')),
    bioMaxChars:      z.number().int(t('mustBeWholeNumber')).min(0, t('mustBeZeroOrGreater')),
    bioMaxImages:     z.number().int(t('mustBeWholeNumber')).min(0, t('mustBeZeroOrGreater')),
    galleryMaxImages: z.number().int(t('mustBeWholeNumber')).min(0, t('mustBeZeroOrGreater')),
    galleryMaxVideos: z.number().int(t('mustBeWholeNumber')).min(0, t('mustBeZeroOrGreater')),

    // Feature flags
    geolocationFullAccess: z.boolean(),
    qrCodeAccess:          z.boolean(),
  })
}

export type SubscriptionFormValues = z.infer<ReturnType<typeof getSubscriptionSchema>>

export const subscriptionDefaultValues: SubscriptionFormValues = {
  code:        '',
  name:        '',
  description: '',
  isActive:    true,

  maxProfiles: 1,
  termLength:  12,
  price:       0,

  treeMaxMembers:   5,
  bioMaxChars:      2000,
  bioMaxImages:     3,
  galleryMaxImages: 10,
  galleryMaxVideos: 2,

  geolocationFullAccess: false,
  qrCodeAccess:          false,
}
