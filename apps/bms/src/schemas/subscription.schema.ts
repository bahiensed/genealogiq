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
    // 0 = not set, derive from price/termLength (same sentinel convention as
    // price's "0 = Free" and termLength's "0 = Lifetime").
    monthlyPrice: z.number().min(0, t('priceMin')),

    // Quotas — feature limits for this plan, read by the APP at runtime
    // (getMemorialFeatures in apps/app/src/lib/subscription.ts).
    treeMaxMembers:        z.number().int(t('mustBeWholeNumber')).nonnegative(t('mustBeZeroOrGreater')),
    bioMaxChars:           z.number().int(t('mustBeWholeNumber')).nonnegative(t('mustBeZeroOrGreater')),
    mediaMaxImages:        z.number().int(t('mustBeWholeNumber')).nonnegative(t('mustBeZeroOrGreater')),
    mediaMaxVideos:        z.number().int(t('mustBeWholeNumber')).nonnegative(t('mustBeZeroOrGreater')),
    documentsMax:          z.number().int(t('mustBeWholeNumber')).nonnegative(t('mustBeZeroOrGreater')),
    geoPlacesMax:          z.number().int(t('mustBeWholeNumber')).nonnegative(t('mustBeZeroOrGreater')),
    memorialsMax:          z.number().int(t('mustBeWholeNumber')).nonnegative(t('mustBeZeroOrGreater')),
    petsMax:               z.number().int(t('mustBeWholeNumber')).nonnegative(t('mustBeZeroOrGreater')),
    qrCodeMax:             z.number().int(t('mustBeWholeNumber')).nonnegative(t('mustBeZeroOrGreater')),
    geolocationFullAccess: z.boolean(),
  })
}

export type SubscriptionFormValues = z.infer<ReturnType<typeof getSubscriptionSchema>>

export const subscriptionDefaultValues: SubscriptionFormValues = {
  code:        '',
  name:        '',
  description: '',
  isActive:    true,

  maxProfiles:  1,
  termLength:   12,
  price:        0,
  monthlyPrice: 0,

  // Conservative defaults matching the current FREE plan — an admin creating
  // a brand-new plan starts here and bumps numbers up before saving.
  treeMaxMembers:        32,
  bioMaxChars:           2048,
  mediaMaxImages:        32,
  mediaMaxVideos:        8,
  documentsMax:          16,
  geoPlacesMax:          3,
  memorialsMax:          1,
  petsMax:               0,
  qrCodeMax:             1,
  geolocationFullAccess: false,
}
