import { createHash } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@genealogiq/services/rate-limit"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex")
}

function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return req.headers.get("x-real-ip")
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let profileId: string | undefined
  try {
    const body = await req.json()
    profileId = typeof body?.profileId === "string" ? body.profileId : undefined
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  if (!profileId) {
    return NextResponse.json({ error: "profileId required" }, { status: 400 })
  }

  const qrCode = await prisma.qrCode.findUnique({
    where:  { appUserId: profileId },
    select: { id: true },
  })
  if (!qrCode) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const ip        = getClientIp(req)
  const userAgent = req.headers.get("user-agent") ?? undefined
  const now       = new Date()

  // This route is public by design (scan counting must work pre-auth), so
  // throttle per IP to stop anyone inflating an arbitrary memorial's scanCount.
  const limit = await checkRateLimit({
    key:           `qr-scan:${ip ? hashIp(ip) : "unknown"}`,
    maxAttempts:   20,
    windowSeconds: 60,
  })
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests" }, {
      status:  429,
      headers: { "Retry-After": String(limit.retryAfter) },
    })
  }

  await prisma.$transaction([
    prisma.qrScan.create({
      data: {
        qrCodeId:  qrCode.id,
        userAgent: userAgent?.slice(0, 512),
        ipHash:    ip ? hashIp(ip) : null,
      },
    }),
    prisma.qrCode.update({
      where: { id: qrCode.id },
      data:  { scanCount: { increment: 1 }, lastScannedAt: now },
    }),
  ])

  return NextResponse.json({ ok: true })
}
