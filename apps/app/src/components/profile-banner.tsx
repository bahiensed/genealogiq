'use client'

import { useState, useTransition } from "react"
import Link from "next/link"
import { useLocale } from "next-intl"
import { getCountryName } from "@genealogiq/core"
import { Cake, Feather, Heart, Images, Flower2, MapPin, SquarePen, BrickWall } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { toggleFavorite } from "@/actions/favorite"
import { toast } from "sonner"

export interface ProfileData {
  id: string
  name: string
  initials: string
  avatarColor: string
  type: "living" | "memorialized"
  avatarUrl?: string | null
  birth?: { date: string; place: string; country?: string | null } | null
  death?: { date: string; place: string; country?: string | null } | null
  geo?: { lat: number; lon: number } | null
  tributes: number
  favoritedBy: number
  mediaTotal: number
  isOwn: boolean
  isGuardian: boolean
  guardedCount: number
  isFavoritedByMe?: boolean
}

interface Props {
  profile: ProfileData
}

const formatPlace = (place: string, country: string | null | undefined, locale: string) =>
  [place, getCountryName(country, locale)].filter(Boolean).join(", ")

export function ProfileBanner({ profile }: Props) {
  const locale = useLocale()
  const isMemorial = profile.type === "memorialized"
  const canEdit = profile.isOwn || profile.isGuardian
  const [favorited, setFavorited] = useState(profile.isFavoritedByMe ?? false)
  const [favCount, setFavCount] = useState(profile.favoritedBy)
  const [isPending, startTransition] = useTransition()

  const fallback = (size: string) => (
    <AvatarFallback className={cn("font-semibold text-white", size, profile.avatarColor)}>
      {profile.initials}
    </AvatarFallback>
  )

  return (
    <section className="relative animate-fade-in pt-24 sm:pt-28 md:pt-28 lg:pt-12">
      <div className="container relative md:mt-6 lg:mt-0">
        <div className="relative animate-scale-in">
          {/* Mobile avatar */}
          <div className="lg:hidden absolute left-1/2 -translate-x-1/2 z-20 -top-12 sm:-top-14 md:-top-20">
            <Avatar className="h-24 w-24 sm:h-28 sm:w-28 md:h-40 md:w-40 ring-4 ring-background shadow-[var(--shadow-glass)]">
              <AvatarImage src={profile.avatarUrl ?? ""} alt={profile.name} />
              {fallback("text-3xl")}
            </Avatar>
          </div>

          <div className="glass-card-deep no-sheen relative px-6 pt-16 pb-8 sm:pt-20 sm:pb-10 md:pt-24 md:pb-8 md:px-8 lg:py-6 xl:py-7 lg:px-10">
            {/* Action buttons */}
            <div className="absolute top-4 right-4 z-20 flex gap-2">
              {canEdit && (
                <Link
                  href={`/profile/${profile.id}/edit`}
                  aria-label="Edit profile"
                  className="h-10 w-10 rounded-full inline-flex items-center justify-center transition-transform hover:scale-110 active:scale-95 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
                >
                  <SquarePen className="h-5 w-5" />
                </Link>
              )}
              {!profile.isOwn && (
                <button
                  onClick={() => {
                    startTransition(async () => {
                      const next = !favorited
                      setFavorited(next)
                      setFavCount((c) => c + (next ? 1 : -1))
                      const result = await toggleFavorite(profile.id)
                      if (result?.error) {
                        setFavorited(!next)
                        setFavCount((c) => c + (next ? -1 : 1))
                        toast.error(result.error)
                      }
                    })
                  }}
                  disabled={isPending}
                  aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
                  className="h-10 w-10 rounded-full glass border-0 inline-flex items-center justify-center transition-transform hover:scale-110 active:scale-95 disabled:opacity-60"
                >
                  <Heart
                    className={cn(
                      "h-5 w-5 transition-colors",
                      favorited ? "fill-rose-500 text-rose-500" : "text-muted-foreground",
                    )}
                  />
                </button>
              )}
            </div>

            <div className="flex flex-col items-center text-center lg:flex-row lg:items-center lg:text-left lg:gap-8">
              {/* Desktop avatar */}
              <div className="hidden lg:block shrink-0 z-10">
                <Avatar className="h-44 w-44 xl:h-52 xl:w-52 ring-4 ring-background shadow-[var(--shadow-glass)]">
                  <AvatarImage src={profile.avatarUrl ?? ""} alt={profile.name} />
                  {fallback("text-5xl")}
                </Avatar>
              </div>

              <div className="flex-1 min-w-0 w-full">
                {/* Badges */}
                <TooltipProvider delayDuration={200}>
                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-3">
                    {isMemorial && (
                      <Badge variant="secondary" className="rounded-full glass border-0 text-xs font-medium">
                        Memorialized
                      </Badge>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="rounded-full glass border-0 text-xs font-medium">
                          <Images className="h-3 w-3 mr-1" />
                          {profile.mediaTotal}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>Media on Gallery</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="rounded-full glass border-0 text-xs font-medium">
                          <Flower2 className="h-3 w-3 mr-1" />
                          {profile.tributes}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>Received Tributes</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="rounded-full glass border-0 text-xs font-medium">
                          <Heart className="h-3 w-3 mr-1" />
                          {favCount}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>Favorites</TooltipContent>
                    </Tooltip>
                    {!isMemorial && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="secondary" className="rounded-full glass border-0 text-xs font-medium">
                            <BrickWall className="h-3 w-3 mr-1" />
                            {profile.guardedCount}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>Guarded Profiles</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TooltipProvider>

                <h1 className="text-3xl lg:text-5xl font-semibold leading-tight tracking-tight truncate">
                  {profile.name}
                </h1>

                <div className="mt-4 flex flex-col gap-2 text-sm min-w-0">
                  {profile.birth && (
                    <div className="flex items-center gap-2 text-muted-foreground justify-center lg:justify-start min-w-0">
                      <Cake className="h-4 w-4 text-primary shrink-0" />
                      <span className="truncate min-w-0">
                        Born on <span className="text-foreground font-medium">{profile.birth.date}</span>
                        {profile.birth.place && (
                          <> in <span className="text-foreground font-medium">{formatPlace(profile.birth.place, profile.birth.country, locale)}</span></>
                        )}
                      </span>
                    </div>
                  )}
                  {isMemorial && profile.death && (
                    <div className="flex items-center gap-2 text-muted-foreground justify-center lg:justify-start min-w-0">
                      <Feather className="h-4 w-4 text-primary shrink-0" />
                      <span className="truncate min-w-0">
                        Deceased on <span className="text-foreground font-medium">{profile.death.date}</span>
                        {profile.death.place && (
                          <> in <span className="text-foreground font-medium">{formatPlace(profile.death.place, profile.death.country, locale)}</span></>
                        )}
                      </span>
                    </div>
                  )}
                  {isMemorial && profile.geo && (profile.geo.lat !== 0 || profile.geo.lon !== 0) && (
                    <div className="flex items-center gap-2 text-muted-foreground justify-center lg:justify-start min-w-0">
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      <a
                        href={`https://www.google.com/maps?q=${profile.geo.lat},${profile.geo.lon}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground font-medium hover:underline truncate min-w-0"
                      >
                        {profile.geo.lat.toFixed(2)}, {profile.geo.lon.toFixed(2)}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
