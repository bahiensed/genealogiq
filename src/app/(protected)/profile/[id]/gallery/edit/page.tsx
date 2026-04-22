import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { GalleryEditForm } from "@/components/gallery-edit-form"
import { verifySession } from "@/lib/dal"
import { getGalleryByUserId } from "@/queries/gallery"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"

interface Props {
  params: Promise<{ id: string }>
}

export default async function GalleryEditPage({ params }: Props) {
  const { id } = await params
  const session = await verifySession()

  const [profile, items] = await Promise.all([getProfileById(id), getGalleryByUserId(id)])
  if (!profile) notFound()

  if (!canManageProfile(profile, session.user.id)) redirect(`/profile/${id}/gallery`)

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32 max-w-5xl">
        <section className="mb-8 flex items-end justify-between gap-4 animate-fade-in">
          <div>
            <div className="flex items-center gap-3 md:gap-4">
              <BackButton href={`/profile/${id}/gallery`} label="Back to gallery" />
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">Edit Gallery</h1>
            </div>
            <p className="text-muted-foreground mt-2">Manage images and videos.</p>
          </div>
          <Button variant="ghost" asChild className="shrink-0">
            <Link href={`/profile/${id}/gallery`}>Cancel</Link>
          </Button>
        </section>

        <GalleryEditForm initial={items} profileId={id} />
      </main>
    </div>
  )
}
