import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { NextResponse } from "next/server"
import { deleteBlobs } from "@/lib/blob"

const ALLOWED_TYPES = ["application/pdf"]
const PDF_MAGIC = "%PDF-"

// Anonymous, unscoped submission (the career dialog is reachable by any site
// visitor) — no ownership check, just content constraints.
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED_TYPES,
        maximumSizeInBytes:  5 * 1024 * 1024,
        addRandomSuffix:     true,
      }),
      onUploadCompleted: async ({ blob }) => {
        // The client-declared content-type checked above can be spoofed (e.g. a
        // renamed .exe served as application/pdf) — verify the actual file header.
        if (!(await isPdf(blob.url))) await deleteBlobs([blob.url])
      },
    })
    return NextResponse.json(json)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}

async function isPdf(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { headers: { Range: "bytes=0-4" } })
    const header = await response.text()
    return header.startsWith(PDF_MAGIC)
  } catch {
    return false
  }
}
