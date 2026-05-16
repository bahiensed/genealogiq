import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// Open search across all AppUsers (memorials + living): a logged-in user can
// look up any profile by name. Memorials are public-facing by product design
// (/profile/[id] is reachable without authorization for the viewer), so the
// search has no per-result visibility filter. If a private/"discoverable" flag
// is ever added to AppUser, gate the where-clause on it here.
export async function GET(request: Request): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? ""
  if (q.length < 3) return NextResponse.json([])

  const terms = q.split(/\s+/).filter(Boolean)

  const results = await prisma.appUser.findMany({
    where: {
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
      gender: true,
      role: true,
      deathDate: true,
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    take: 8,
  })

  return NextResponse.json(results)
}
