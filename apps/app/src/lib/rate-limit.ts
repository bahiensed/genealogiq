import 'server-only'

import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function getClientIp(): Promise<string> {
  const h   = await headers()
  const xff = h.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return h.get('x-real-ip') ?? 'unknown'
}

interface CheckRateLimitOpts {
  key:           string
  maxAttempts:   number
  windowSeconds: number
}

export interface RateLimitResult {
  allowed:    boolean
  retryAfter: number
}

export async function checkRateLimit({
  key,
  maxAttempts,
  windowSeconds,
}: CheckRateLimitOpts): Promise<RateLimitResult> {
  const since = new Date(Date.now() - windowSeconds * 1000)

  const recent = await prisma.rateLimitAttempt.findMany({
    where:   { key, attemptedAt: { gte: since } },
    orderBy: { attemptedAt: 'asc' },
    take:    maxAttempts,
    select:  { attemptedAt: true },
  })

  if (recent.length >= maxAttempts) {
    const oldest     = recent[0].attemptedAt
    const retryAfter = Math.max(1, Math.ceil((oldest.getTime() + windowSeconds * 1000 - Date.now()) / 1000))
    return { allowed: false, retryAfter }
  }

  await prisma.rateLimitAttempt.create({ data: { key } })

  if (Math.random() < 0.01) {
    await prisma.rateLimitAttempt
      .deleteMany({ where: { attemptedAt: { lt: new Date(Date.now() - 3600 * 1000) } } })
      .catch(() => {})
  }

  return { allowed: true, retryAfter: 0 }
}
