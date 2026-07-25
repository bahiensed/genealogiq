import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { canManageProfile } from "@/lib/profile"
import { deleteBlobs } from "@/lib/blob"

// Documents combines two existing upload patterns: ownership scoping (like
// places/upload) since documents belong to a profile, and PDF magic-byte
// verification (like career/upload) since the client-declared content-type is
// spoofable.
const ALLOWED_TYPES = ["application/pdf"]
const PDF_MAGIC = "%PDF-"

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
          select: { id: true, guardedBy: { where: { status: "ACCEPTED" }, select: { guardianId: true, status: true } } },
        })
        if (!profile) throw new Error("Profile not found")
        if (!canManageProfile(profile, session.user.id)) throw new Error("Forbidden")

        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes:  10 * 1024 * 1024,
          addRandomSuffix:     true,
        }
      },
      onUploadCompleted: async ({ blob }) => {
        if (!(await isPdf(blob.url))) await deleteBlobs([blob.url])
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

async function isPdf(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { headers: { Range: "bytes=0-4" } })
    const header = await response.text()
    return header.startsWith(PDF_MAGIC)
  } catch {
    return false
  }
}
