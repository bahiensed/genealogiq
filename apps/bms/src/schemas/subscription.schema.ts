import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

export const subscriptionSchema = z.object({
  code:        z.string()
    .min(2, 'Must be at least 2 characters')
    .max(32, 'Must be at most 32 characters')
    .regex(/^[A-Z0-9_]+$/, 'Use uppercase letters, numbers and underscores only'),
  name:        z.string()
    .min(4, 'Must be at least 4 characters')
    .max(64, 'Must be at most 64 characters'),
  description: z.string().max(256, 'Must be at most 256 characters').optional(),
  isActive:    z.boolean(),

  // Commercial
  maxProfiles: z.number().int('Must be a whole number').positive('Must be greater than zero'),
  termLength:  z.number().int('Must be a whole number').min(0, 'Must be 0 (lifetime) or a positive number of months'),
  price:       z.number().min(0, 'Must be 0 (free) or greater'),

  // Feature limits
  treeMaxMembers:   z.number().int('Must be a whole number').min(0, 'Must be 0 or greater'),
  bioMaxChars:      z.number().int('Must be a whole number').min(0, 'Must be 0 or greater'),
  bioMaxImages:     z.number().int('Must be a whole number').min(0, 'Must be 0 or greater'),
  galleryMaxImages: z.number().int('Must be a whole number').min(0, 'Must be 0 or greater'),
  galleryMaxVideos: z.number().int('Must be a whole number').min(0, 'Must be 0 or greater'),

  // Feature flags
  geolocationFullAccess: z.boolean(),
  qrCodeAccess:          z.boolean(),
})

export type SubscriptionFormValues = z.infer<typeof subscriptionSchema>

export const subscriptionResolver = zodResolver(subscriptionSchema)

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
