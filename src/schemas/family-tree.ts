import { z } from "zod"

export const addRelationSchema = z.object({
  fromId: z.string().cuid(),
  toId: z.string().cuid(),
  type: z.enum(["PARENT_OF", "SPOUSE", "SIBLING"]),
  subtype: z.string().optional(),
})

export type AddRelationInput = z.infer<typeof addRelationSchema>

export const ghostRelativeSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(64),
  lastName:  z.string().trim().min(1, "Last name is required.").max(64),
  gender:    z.enum(["MALE", "FEMALE", "OTHER"]).nullable().optional(),
  birthDate: z.string().optional().nullable(),
  deathDate: z.string().optional().nullable(),
  // Relation to the anchor (existing node in the tree)
  anchorId:  z.string().cuid(),
  kind:      z.enum(["parent", "child", "spouse", "sibling"]),
})

export type GhostRelativeInput = z.infer<typeof ghostRelativeSchema>
