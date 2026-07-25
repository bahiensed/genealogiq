import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
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
  const t = await getTranslations("Favorites")

  const [profile, favorites] = await Promise.all([
    getProfileById(id),
    getFavoritesByUserId(id),
  ])
  if (!profile) notFound()

  return (
    <div className="relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32">
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
              <BackButton href={`/profile/${id}`} label={t("backToProfile")} />
              <h1 className="text-4xl font-semibold tracking-tight whitespace-nowrap">{t("title")}</h1>
            </div>
            {favorites.length > 0 && (
              <span className="shrink-0 inline-flex items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-0.5">
                {t("profileCount", { count: favorites.length })}
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-2 italic">
            {t("subtitle")}
          </p>
          {favorites.length > 0 && (
            <p className="scroll-m-20 text-xl lg:text-2xl font-semibold tracking-tight mt-1">
              {profile.firstName} {profile.lastName}
            </p>
          )}
        </div>

        <FavoritesClient items={favorites} />
      </main>
    </div>
  )
}
