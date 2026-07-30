import { NextResponse } from "next/server"
import { checkRateLimit } from "@genealogiq/services/rate-limit"
import { auth } from "@/auth"
import { searchWikiTreePerson, WikiTreeApiError } from "@/lib/wikitree"

// Proxies WikiTree's public searchPerson action server-side so the WikiTree
// call itself never happens from the client (rate limiting + no exposing the
// upstream shape directly). Session-gated like /api/search, though WikiTree
// itself needs no key — this only bounds abuse of *our* outbound calls.
export async function GET(request: Request): Promise<NextResponse> {
  if (process.env.ENABLE_WIKITREE_SEARCH === "false") {
    return NextResponse.json({ error: "disabled" }, { status: 503 })
  }

  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const limit = await checkRateLimit({ key: `wikitree-search:${session.user.id}`, maxAttempts: 20, windowSeconds: 3600 })
  if (!limit.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 })

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? ""
  if (q.length < 3) return NextResponse.json([])

  try {
    const results = await searchWikiTreePerson(q)
    return NextResponse.json(results)
  } catch (e) {
    if (e instanceof WikiTreeApiError) return NextResponse.json({ error: "unavailable" }, { status: 502 })
    throw e
  }
}
