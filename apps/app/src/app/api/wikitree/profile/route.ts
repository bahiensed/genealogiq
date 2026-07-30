import { NextResponse } from "next/server"
import { checkRateLimit } from "@genealogiq/services/rate-limit"
import { auth } from "@/auth"
import { getWikiTreeProfile, WikiTreeApiError } from "@/lib/wikitree"

// WikiTree Ids look like "Doe-123" — this guards against feeding an arbitrary
// string into the upstream query string (SSRF-by-injection into api.wikitree.com).
const WIKITREE_ID_PATTERN = /^[A-Za-z0-9_-]+$/

export async function GET(request: Request): Promise<NextResponse> {
  if (process.env.ENABLE_WIKITREE_SEARCH === "false") {
    return NextResponse.json({ error: "disabled" }, { status: 503 })
  }

  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const limit = await checkRateLimit({ key: `wikitree-profile:${session.user.id}`, maxAttempts: 30, windowSeconds: 3600 })
  if (!limit.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 })

  const id = new URL(request.url).searchParams.get("id")?.trim() ?? ""
  if (!id || !WIKITREE_ID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 })
  }

  try {
    const profile = await getWikiTreeProfile(id)
    return NextResponse.json(profile)
  } catch (e) {
    if (e instanceof WikiTreeApiError) return NextResponse.json({ error: "unavailable" }, { status: 502 })
    throw e
  }
}
