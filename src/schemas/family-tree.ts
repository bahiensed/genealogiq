import { z } from "zod"

export const addRelationSchema = z.object({
  fromId: z.string().cuid(),
  toId: z.string().cuid(),
  type: z.enum(["PARENT_OF", "SPOUSE", "SIBLING"]),
  subtype: z.string().optional(),
})

export type AddRelationInput = z.infer<typeof addRelationSchema>
