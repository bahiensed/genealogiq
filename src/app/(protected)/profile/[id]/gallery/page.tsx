import { notFound } from "next/navigation"
import { verifySession } from "@/lib/dal"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { GalleryClient } from "@/components/gallery-client"
import { getGalleryByUserId } from "@/queries/gallery"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProfileGalleryPage({ params }: Props) {
  const { id } = await params
  const session = await verifySession()
  const [profile, items] = await Promise.all([getProfileById(id), getGalleryByUserId(id)])

  if (!profile) notFound()

  const isOwn = canManageProfile(profile, session.user.id)
  const name = `${profile.firstName} ${profile.lastName}`

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32 max-w-6xl">
        <div className="flex items-center gap-3 md:gap-4 mb-2 animate-fade-in">
          <BackButton href={`/profile/${id}`} label="Back to profile" />
          <div>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">Gallery</h1>
            {!isOwn && <p className="text-muted-foreground text-sm mt-1">{name}</p>}
          </div>
        </div>

        <GalleryClient items={items} editHref={`/profile/${id}/gallery/edit`} isOwn={isOwn} />
      </main>
    </div>
  )
}
