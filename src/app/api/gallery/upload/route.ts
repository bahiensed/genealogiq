import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { canManageProfile } from "@/lib/profile"

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
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        const { profileId } = parseClientPayload(clientPayload)
        const profile = await prisma.appUser.findUnique({
          where:  { id: profileId },
          select: { id: true, guardedBy: { where: { status: "ACCEPTED" }, select: { guardianId: true } } },
        })
        if (!profile) throw new Error("Profile not found")
        if (!canManageProfile(profile, session.user.id)) throw new Error("Forbidden")

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

function parseClientPayload(raw: string | null): { profileId: string } {
  if (!raw) throw new Error("Missing profileId")
  try {
    const parsed = JSON.parse(raw) as { profileId?: unknown }
    if (typeof parsed.profileId !== "string" || !parsed.profileId) throw new Error("Missing profileId")
    return { profileId: parsed.profileId }
  } catch {
    throw new Error("Invalid client payload")
  }
}
