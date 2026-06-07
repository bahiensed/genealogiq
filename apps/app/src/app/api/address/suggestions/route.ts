import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const zip = new URL(request.url).searchParams.get("zip")?.trim() ?? ""
  if (!zip) return NextResponse.json([])

  // Postal-level fields only. We intentionally DO NOT return `number` or
  // `complement` (unit-level identifiers): this zip autocomplete is shared across
  // all users, so returning another user's apartment/unit would leak PII via
  // enumeration. (Security B1.)
  const [addressRows, geoRows] = await Promise.all([
    prisma.address.findMany({
      where: { zip },
      select: { zip: true, street: true, neighborhood: true, city: true, state: true, country: true },
      take: 10,
    }),
    prisma.geolocation.findMany({
      where: { zip },
      select: { zip: true, street: true, neighborhood: true, city: true, state: true, country: true },
      take: 10,
    }),
  ])

  type Row = { zip: string | null; street: string | null; neighborhood: string | null; city: string | null; state: string | null; country: string | null }
  const all: Row[] = [...addressRows, ...geoRows]

  const seen = new Set<string>()
  const deduped: Row[] = []
  for (const row of all) {
    const key = `${(row.street ?? "").toLowerCase()}|${(row.neighborhood ?? "").toLowerCase()}|${(row.city ?? "").toLowerCase()}`
    if (!seen.has(key)) {
      seen.add(key)
      deduped.push(row)
    }
    if (deduped.length >= 5) break
  }

  return NextResponse.json(deduped)
}
