"use server"

import { headers } from "next/headers"
import { done, fail, type ActionResult } from "@genealogiq/core"
import { checkRateLimit } from "@genealogiq/services/rate-limit"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { pushSubscribeSchema, pushUnsubscribeSchema } from "@/schemas/push.schema"

// Web push subscription lifecycle for the CURRENT device. The input is the
// browser's programmatic PushSubscription.toJSON() — failures are never shown
// as field errors, so plain Zod issue messages are enough.

const MAX_USER_AGENT = 255

export async function subscribePush(data: unknown): Promise<ActionResult> {
  const session = await verifySession()
  const parsed = pushSubscribeSchema.safeParse(data)
  if (!parsed.success) return fail(parsed.error.issues[0].message)

  const limit = await checkRateLimit({
    key: `push-subscribe:${session.user.id}`,
    maxAttempts: 10,
    windowSeconds: 3600,
  })
  if (!limit.allowed) return fail("Too many requests")

  // Never trust a client-sent UA — read it from the request.
  const userAgent =
    (await headers()).get("user-agent")?.slice(0, MAX_USER_AGENT) ?? null

  const { endpoint, keys } = parsed.data
  // Upsert by endpoint: on a shared device the endpoint moves to whoever
  // subscribed last, so pushes always route to the current account.
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: session.user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent,
    },
    update: {
      userId: session.user.id,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent,
    },
  })

  return done()
}

export async function unsubscribePush(data: unknown): Promise<ActionResult> {
  await verifySession()
  const parsed = pushUnsubscribeSchema.safeParse(data)
  if (!parsed.success) return fail(parsed.error.issues[0].message)

  // Deliberately NOT scoped to the session user: endpoints are unguessable
  // capability URLs, and whoever holds the browser owns the channel — scoping
  // would strand rows when a second account disables push on a shared device.
  await prisma.pushSubscription.deleteMany({
    where: { endpoint: parsed.data.endpoint },
  })

  return done()
}
