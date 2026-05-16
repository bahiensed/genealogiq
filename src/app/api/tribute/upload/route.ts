import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

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
        // Mirrors submitTribute(): the author may not tribute their own profile.
        if (profileId === session.user.id) throw new Error("You cannot tribute your own profile")

        const profile = await prisma.appUser.findUnique({
          where:  { id: profileId },
          select: { id: true },
        })
        if (!profile) throw new Error("Profile not found")

        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes:  10 * 1024 * 1024,
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
