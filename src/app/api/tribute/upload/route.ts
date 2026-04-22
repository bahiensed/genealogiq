import { put } from "@vercel/blob"
import { NextResponse } from "next/server"
import { auth } from "@/auth"

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])
const MAX_SIZE = 10 * 1024 * 1024

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const filename = new URL(request.url).searchParams.get("filename")
  if (!filename) return NextResponse.json({ error: "filename is required" }, { status: 400 })

  const contentType = request.headers.get("content-type") ?? ""
  if (!ALLOWED_TYPES.has(contentType)) return NextResponse.json({ error: "File type not allowed" }, { status: 400 })

  const contentLength = Number(request.headers.get("content-length") ?? 0)
  if (contentLength > MAX_SIZE) return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 })

  if (!request.body) return NextResponse.json({ error: "No file provided" }, { status: 400 })

  try {
    const blob = await put(`tributes/${filename}`, request.body, {
      access: "public",
      addRandomSuffix: true,
      contentType,
    })
    return NextResponse.json({ url: blob.url })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
