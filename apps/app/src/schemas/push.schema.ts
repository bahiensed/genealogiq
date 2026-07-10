import { z } from "zod"

// Validates the programmatic PushSubscription.toJSON() shape the browser
// produces — no user-facing field errors needed, so no translator factory.

const B64URL = /^[A-Za-z0-9_-]+$/

const endpoint = z.url().startsWith("https://").max(2048)

export const pushSubscribeSchema = z.object({
  endpoint,
  keys: z.object({
    p256dh: z.string().min(1).max(256).regex(B64URL),
    auth: z.string().min(1).max(256).regex(B64URL),
  }),
})

export const pushUnsubscribeSchema = z.object({
  endpoint,
})

export type PushSubscribeInput = z.infer<typeof pushSubscribeSchema>
