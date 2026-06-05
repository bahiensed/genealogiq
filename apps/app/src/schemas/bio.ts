import { z } from "zod"

export const bioImageSchema = z.object({
  id: z.string().optional(),
  url: z.string().url(),
  aspect: z.enum(["square", "portrait", "landscape"]).default("square"),
  order: z.number().int().min(0),
})

export const bioSchema = z.object({
  quote: z.string().trim().max(140).optional(),
  text: z.string().trim().optional(),
  images: z.array(bioImageSchema).default([]),
})

export type BioFormData = z.infer<typeof bioSchema>
export type BioImageData = z.infer<typeof bioImageSchema>
