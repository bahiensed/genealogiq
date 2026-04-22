import { notFound } from "next/navigation"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { FavoritesClient } from "@/components/favorites-client"
import { verifySession } from "@/lib/dal"
import { getProfileById } from "@/queries/profile"
import { getFavoritesByUserId } from "@/queries/favorite"

interface Props {
  params: Promise<{ id: string }>
}

export default async function FavoritesPage({ params }: Props) {
  const { id } = await params
  await verifySession()

  const [profile, favorites] = await Promise.all([
    getProfileById(id),
    getFavoritesByUserId(id),
  ])
  if (!profile) notFound()

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32 max-w-5xl">
        <section className="mb-8 flex items-end justify-between gap-4 animate-fade-in">
          <div>
            <div className="flex items-center gap-3 md:gap-4">
              <BackButton href={`/profile/${id}`} label="Back to profile" />
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">Favorites</h1>
            </div>
            <p className="text-muted-foreground mt-2 italic">
              The ones closest to the heart — kept near, always.
            </p>
          </div>
          {favorites.length > 0 && (
            <span className="shrink-0 inline-flex items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-0.5">
              {favorites.length}
            </span>
          )}
        </section>

        <FavoritesClient items={favorites} />
      </main>
    </div>
  )
}
