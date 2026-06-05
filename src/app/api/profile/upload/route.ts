import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { checkRateLimit } from "@/lib/rate-limit"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        // Cap avatar blob-token minting per user to prevent storage abuse.
        const rl = await checkRateLimit({
          key: `upload:avatar:${session.user.id}`,
          maxAttempts: 20,
          windowSeconds: 600,
        })
        if (!rl.allowed) throw new Error(`Too many uploads. Try again in ${rl.retryAfter}s.`)

        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes:  5 * 1024 * 1024,
          addRandomSuffix:     true,
        }
      },
      onUploadCompleted: async () => {},
    })
    return NextResponse.json(json)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
