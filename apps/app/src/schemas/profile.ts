import { z } from "zod"
import type { Translator } from "./i18n"
import { addressSchema } from "./address.schema"

export { addressSchema }

export function getProfileEditSchema(t: Translator) {
  return z.object({
    // Identity
    firstName:    z.string().trim().min(1, t("required")).max(100),
    lastName:     z.string().trim().min(1, t("required")).max(100),
    maidenName:   z.string().trim().max(100).optional(),
    nickname:     z.string().trim().max(100).optional(),
    gender:       z.enum(["MALE", "FEMALE", "OTHER"]).optional().nullable(),
    nationalId:   z.string().trim().max(50).optional(),
    avatarUrl:    z.string().url().optional().nullable(),

    // Birth
    birthDate:    z.coerce.date().optional().nullable(),
    birthPlace:   z.string().trim().max(100).optional(),
    birthState:   z.string().trim().max(100).optional(),
    birthCountry: z.string().trim().max(100).optional(),

    // Death (APP_MEMO only)
    deathDate:    z.coerce.date().optional().nullable(),
    deathPlace:   z.string().trim().max(100).optional(),
    deathState:   z.string().trim().max(100).optional(),
    deathCountry: z.string().trim().max(100).optional(),
    deathCause:   z.string().trim().max(200).optional(),

    // Contact
    phoneCountryCode: z.string().trim().max(5).optional(),
    phone:            z.string().trim().max(30).optional(),

    // Social
    website:     z.string().trim().max(250).optional(),
    instagram:   z.string().trim().max(250).optional(),
    linkedin:    z.string().trim().max(250).optional(),
    fb:          z.string().trim().max(250).optional(),
    x:           z.string().trim().max(250).optional(),
    tiktok:      z.string().trim().max(250).optional(),
    youtube:     z.string().trim().max(250).optional(),
    otherSocial: z.string().trim().max(250).optional(),

    // Notes
    notes: z.string().trim().max(1000).optional(),

    // Address (via Address relation)
    address: addressSchema,
  })
}

export type ProfileEditValues = z.infer<ReturnType<typeof getProfileEditSchema>>
