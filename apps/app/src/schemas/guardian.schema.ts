import { z } from "zod"

export const requestGuardianshipSchema = z.object({
  profileId: z.string().cuid(),
})

export const guardianshipActionSchema = z.object({
  guardianshipId: z.string().cuid(),
})

export type RequestGuardianshipInput = z.infer<typeof requestGuardianshipSchema>
export type GuardianshipActionInput  = z.infer<typeof guardianshipActionSchema>
