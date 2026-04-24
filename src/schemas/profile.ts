import { z } from "zod"

export const profileUpdateSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(100),
  lastName: z.string().trim().min(1, "Last name is required.").max(100),
  gender: z.enum(["male", "female"]).optional().nullable(),
  birthDate: z.coerce.date().optional().nullable(),
  birthPlace: z.string().trim().max(100).optional(),
  birthCountry: z.string().trim().max(100).optional(),
  avatarUrl: z.string().url().optional().nullable(),
})
