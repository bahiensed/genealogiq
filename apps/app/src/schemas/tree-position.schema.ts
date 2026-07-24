import { z } from "zod"

export const saveNodePositionSchema = z.object({
  personId:   z.string().cuid(),
  dx:         z.number().finite(),
  dy:         z.number().finite(),
  generation: z.number().int(),
})

export type SaveNodePositionInput = z.infer<typeof saveNodePositionSchema>
