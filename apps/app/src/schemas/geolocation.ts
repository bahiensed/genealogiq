import { z } from "zod"
import { addressSchema } from "./address.schema"

export const geolocationSchema = z.object({
  placeName: z.string().trim().min(1, "Place name is required.").max(120),
  address: addressSchema,
  section: z.string().trim().max(200).optional(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  notes: z.string().trim().max(500).optional(),
  photo1: z.string().url().optional().nullable(),
  photo2: z.string().url().optional().nullable(),
  photo3: z.string().url().optional().nullable(),
})

export type GeolocationFormValues = z.infer<typeof geolocationSchema>
