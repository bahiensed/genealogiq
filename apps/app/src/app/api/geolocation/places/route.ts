import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? ""
  if (q.length < 2) return NextResponse.json([])

  const results = await prisma.geolocation.findMany({
    where: { placeName: { contains: q, mode: "insensitive" } },
    select: {
      placeName: true,
      zip: true,
      street: true,
      number: true,
      complement: true,
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
