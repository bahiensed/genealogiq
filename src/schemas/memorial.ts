import { z } from "zod"

export const memorialSchema = z.object({
  firstName: z.string().min(1, "First name is required.").max(100),
  lastName: z.string().min(1, "Last name is required.").max(100),
  birthDate: z.coerce.date({ error: "Birth date is required." }),
  birthPlace: z.string().max(100).optional(),
  birthCountry: z.string().max(100).optional(),
  deathDate: z.coerce.date().optional().nullable(),
  deathPlace: z.string().max(100).optional(),
  deathCountry: z.string().max(100).optional(),
  avatarUrl: z.string().url().optional().nullable(),
})
