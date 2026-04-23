import { z } from "zod"

export const bioImageSchema = z.object({
  id: z.string().optional(),
  url: z.string().url(),
  aspect: z.enum(["square", "portrait", "landscape"]).default("square"),
  order: z.number().int().min(0),
})

export const bioSchema = z.object({
  quote: z.string().trim().max(140).optional(),
  text: z.string().trim().max(2048).optional(),
  images: z.array(bioImageSchema).max(5).default([]),
})

export type BioFormData = z.infer<typeof bioSchema>
export type BioImageData = z.infer<typeof bioImageSchema>
