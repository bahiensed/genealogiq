import { z } from "zod"

export const profileUpdateSchema = z.object({
  firstName: z.string().min(1, "First name is required.").max(100),
  lastName: z.string().min(1, "Last name is required.").max(100),
  birthDate: z.coerce.date().optional().nullable(),
  birthPlace: z.string().max(100).optional(),
  birthCountry: z.string().max(100).optional(),
  avatarUrl: z.string().url().optional().nullable(),
})
