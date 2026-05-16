import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { NextResponse } from "next/server"
import { auth } from "@/auth"

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/webm", "video/quicktime",
]

// Client-uploads route: returns a short-lived blob token so the browser PUTs
// straight to Vercel Blob storage instead of sending the file through the
// serverless function (which would 413 anything over ~4.5 MB).
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await auth()
        if (!session?.user) throw new Error("Unauthorized")
        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes:  100 * 1024 * 1024,
          addRandomSuffix:     true,
        }
      },
      onUploadCompleted: async () => {
        // No-op for now — the gallery row is created by the gallery save action,
        // which gets the URL back from the client after a successful upload.
      },
    })
    return NextResponse.json(json)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
