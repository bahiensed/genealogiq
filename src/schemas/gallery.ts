import { z } from "zod"

export const mediaItemSchema = z.object({
  id: z.string().optional(),
  kind: z.enum(["image", "video"]),
  url: z.string().url(),
  poster: z.string().url().optional(),
  durationSec: z.number().positive().optional(),
  takenAt: z.string().optional(),
  location: z.string().max(100).optional(),
  description: z.string().max(280).optional(),
  order: z.number().int().min(0),
})

export const saveGallerySchema = z.object({
  items: z.array(mediaItemSchema).max(25),
})

export type MediaItemData = z.infer<typeof mediaItemSchema>
export type SaveGalleryData = z.infer<typeof saveGallerySchema>
