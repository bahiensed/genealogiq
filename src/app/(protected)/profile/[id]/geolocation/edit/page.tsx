import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { GeolocationEditForm } from "@/components/geolocation-edit-form"
import { verifySession } from "@/lib/dal"
import { getProfileById } from "@/queries/profile"
import { getGeolocationByUserId } from "@/queries/geolocation"
import { canManageProfile } from "@/lib/profile"
import { getMemorialFeatures } from "@/lib/subscription"

interface Props {
  params: Promise<{ id: string }>
}

export default async function GeolocationEditPage({ params }: Props) {
  const { id } = await params
  const session = await verifySession()

  const [profile, existing, features] = await Promise.all([
    getProfileById(id),
    getGeolocationByUserId(id),
    getMemorialFeatures(id),
  ])
  if (!profile) notFound()

  if (!canManageProfile(profile, session.user.id)) redirect(`/profile/${id}/geolocation`)

  const isCreating = !existing

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32 max-w-4xl">
        <section className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-fade-in">
          <div className="bg-transparent">
            <div className="flex items-center gap-3 md:gap-4">
              <BackButton href={`/profile/${id}/geolocation`} label="Back to geolocation" />
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight whitespace-nowrap">
                {isCreating ? "Add Geolocation" : "Edit Geolocation"}
              </h1>
            </div>
            <p className="text-muted-foreground mt-2 bg-transparent">
              {isCreating
                ? "Add the resting place and how to find it."
                : "Update place, address and coordinates."}
            </p>
          </div>
          <Button variant="ghost" asChild className="shrink-0">
            <Link href={`/profile/${id}/geolocation`}>Cancel</Link>
          </Button>
        </section>

        <GeolocationEditForm
          profileId={id}
          existing={existing}
          geolocationFullAccess={features.geolocationFullAccess}
        />
      </main>
    </div>
  )
}
