import { z } from "zod"

export const tributeSchema = z.object({
  text: z.string().trim().min(1, "Write something before publishing.").max(512),
  imageUrl: z.string().url().optional(),
})

export type TributeFormData = z.infer<typeof tributeSchema>
