import { z } from "zod"

// ─── Subtype canon ───────────────────────────────────────────────────────────

export const PARENT_OF_SUBTYPES = ["blood", "adopted", "step"] as const
export const SPOUSE_SUBTYPES    = ["married", "divorced", "partner", "widowed"] as const
export const SIBLING_SUBTYPES   = ["blood", "half", "adopted", "step"] as const

export type ParentOfSubtype = typeof PARENT_OF_SUBTYPES[number]
export type SpouseSubtype   = typeof SPOUSE_SUBTYPES[number]
export type SiblingSubtype  = typeof SIBLING_SUBTYPES[number]

export const RELATION_TYPES = ["PARENT_OF", "SPOUSE", "SIBLING"] as const
export type RelationType = typeof RELATION_TYPES[number]

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date").optional().nullable()

const subtypeForType = (type: RelationType): readonly string[] =>
  type === "PARENT_OF" ? PARENT_OF_SUBTYPES
  : type === "SPOUSE"  ? SPOUSE_SUBTYPES
  : SIBLING_SUBTYPES

// ─── addRelation ─────────────────────────────────────────────────────────────

export const addRelationSchema = z.object({
  fromId:    z.string().cuid(),
  toId:      z.string().cuid(),
  type:      z.enum(RELATION_TYPES),
  subtype:   z.string().min(1),
  startDate: dateString,
  endDate:   dateString,
}).refine((d) => subtypeForType(d.type).includes(d.subtype), {
  message: "Subtype is not valid for this relation type.",
  path:    ["subtype"],
})

export type AddRelationInput = z.infer<typeof addRelationSchema>

// ─── addGhostRelative ────────────────────────────────────────────────────────

const ghostIdentity = z.object({
  firstName:  z.string().trim().min(1, "First name is required.").max(64),
  lastName:   z.string().trim().min(1, "Last name is required.").max(64),
  maidenName: z.string().trim().max(64).optional().nullable(),
  nickname:   z.string().trim().max(40).optional().nullable(),
  shortBio:   z.string().trim().max(140).optional().nullable(),
  gender:     z.enum(["MALE", "FEMALE", "OTHER"]).nullable().optional(),
  birthDate:  dateString,
  deathDate:  dateString,
})

export const addGhostRelativeSchema = ghostIdentity.extend({
  anchorId:  z.string().cuid(),
  kind:      z.enum(["parent", "child", "spouse", "sibling"]),
  subtype:   z.string().min(1),
  startDate: dateString,
  endDate:   dateString,
}).refine((d) => {
  const type: RelationType = d.kind === "spouse" ? "SPOUSE" : d.kind === "sibling" ? "SIBLING" : "PARENT_OF"
  return subtypeForType(type).includes(d.subtype)
}, {
  message: "Subtype is not valid for this relation kind.",
  path:    ["subtype"],
})

export type AddGhostRelativeInput = z.infer<typeof addGhostRelativeSchema>

// ─── updateMember (identity patch) ───────────────────────────────────────────

export const updateMemberSchema = ghostIdentity.extend({
  avatarUrl: z.string().url().optional().nullable(),
})

export type UpdateMemberInput = z.infer<typeof updateMemberSchema>

// ─── updateRelation (subtype + dates) ────────────────────────────────────────

export const updateRelationSchema = z.object({
  subtype:   z.string().min(1),
  startDate: dateString,
  endDate:   dateString,
})

export type UpdateRelationInput = z.infer<typeof updateRelationSchema>
