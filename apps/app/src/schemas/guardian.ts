import { z } from "zod"

export const requestGuardianshipSchema = z.object({
  profileId: z.string().min(1),
})

export const guardianshipActionSchema = z.object({
  guardianshipId: z.string().min(1),
})

export type RequestGuardianshipInput = z.infer<typeof requestGuardianshipSchema>
export type GuardianshipActionInput  = z.infer<typeof guardianshipActionSchema>
