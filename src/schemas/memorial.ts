import { z } from "zod"

export const memorialSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(100),
  lastName: z.string().trim().min(1, "Last name is required.").max(100),
  birthDate: z.coerce.date({ error: "Birth date is required." }),
  birthPlace: z.string().trim().max(100).optional(),
  birthCountry: z.string().trim().max(100).optional(),
  deathDate: z.coerce.date().optional().nullable(),
  deathPlace: z.string().trim().max(100).optional(),
  deathCountry: z.string().trim().max(100).optional(),
  avatarUrl: z.string().url().optional().nullable(),
})
