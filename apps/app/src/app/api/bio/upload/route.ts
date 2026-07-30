import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { canManageProfile } from "@/lib/profile"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

type ClientPayload =
  | { profileId: string }
  | { scope: "create-memorial" | "create-pet" }

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        const payload = parseClientPayload(clientPayload)

        if ("profileId" in payload) {
          // Editing an existing profile's bio/avatar — must be owner or guardian.
          const profile = await prisma.appUser.findUnique({
            where:  { id: payload.profileId },
            select: { id: true, guardedBy: { where: { status: "ACCEPTED" }, select: { guardianId: true, status: true } } },
          })
          if (!profile) throw new Error("Profile not found")
          if (!canManageProfile(profile, session.user.id)) throw new Error("Forbidden")
        }
        // For scope=create-memorial/create-pet the quota is enforced by
        // createMemorial()/createPet() themselves; an orphaned avatar blob is
        // bounded by the per-upload size limit below.

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

function parseClientPayload(raw: string | null): ClientPayload {
  if (!raw) throw new Error("Missing client payload")
  try {
    const parsed = JSON.parse(raw) as Partial<{ profileId: unknown; scope: unknown }>
    if (typeof parsed.profileId === "string" && parsed.profileId) {
      return { profileId: parsed.profileId }
    }
    if (parsed.scope === "create-memorial" || parsed.scope === "create-pet") {
      return { scope: parsed.scope }
    }
    throw new Error("Invalid client payload")
  } catch {
    throw new Error("Invalid client payload")
  }
}
