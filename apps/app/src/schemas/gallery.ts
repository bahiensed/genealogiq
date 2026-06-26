import { z } from "zod"
import { BLOB_URL_PATTERN } from "@genealogiq/core"

// Gallery media is uploaded to Vercel Blob (see /api/gallery/upload), so the
// stored URLs must point at that host — never an arbitrary external origin.
const blobUrl = z.string().regex(BLOB_URL_PATTERN, "Invalid media URL")

export const mediaItemSchema = z.object({
  id: z.string().optional(),
  kind: z.enum(["image", "video"]),
  url: blobUrl,
  poster: blobUrl.optional(),
  durationSec: z.number().positive().optional(),
  takenAt: z.string().optional(),
  location: z.string().trim().max(100).optional(),
  description: z.string().trim().max(280).optional(),
  order: z.number().int().min(0),
})

export const saveGallerySchema = z.object({
  items: z.array(mediaItemSchema),
})

export type MediaItemData = z.infer<typeof mediaItemSchema>
export type SaveGalleryData = z.infer<typeof saveGallerySchema>
