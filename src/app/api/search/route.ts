import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? ""
  if (q.length < 3) return NextResponse.json([])

  const terms = q.split(/\s+/).filter(Boolean)

  const results = await prisma.user.findMany({
    where: {
      role: { in: ["APP_USER", "APP_MEMO"] },
      AND: terms.map((term) => ({
        OR: [
          { firstName: { contains: term, mode: "insensitive" } },
          { lastName: { contains: term, mode: "insensitive" } },
        ],
      })),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      role: true,
      birthPlace: true,
      birthCountry: true,
      deathDate: true,
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    take: 8,
  })

  return NextResponse.json(results)
}
