import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? ""
  if (q.length < 2) return NextResponse.json([])

  // Cross-user place lookup. Coordinates are public by design (a resting place is
  // meant to be findable), but `number`/`complement` (unit-level identifiers) are
  // omitted so this name search can't be used to enumerate other users' precise
  // unit addresses. (Security B1.)
  const results = await prisma.geolocation.findMany({
    where: { placeName: { contains: q, mode: "insensitive" } },
    select: {
      placeName: true,
      zip: true,
      street: true,
      neighborhood: true,
      city: true,
      state: true,
      country: true,
      lat: true,
      lon: true,
    },
    take: 6,
  })

  return NextResponse.json(results)
}
