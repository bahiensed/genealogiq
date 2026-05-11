import Link from "next/link"
import { notFound } from "next/navigation"
import { NotebookText, NotebookPen, Quote } from "lucide-react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Button } from "@/components/ui/button"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { verifySession } from "@/lib/dal"
import { getBioByUserId } from "@/queries/bio"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { getMemorialFeatures } from "@/lib/subscription"
import { UpgradeHint } from "@/components/upgrade-hint"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProfileBioPage({ params }: Props) {
  const { id } = await params
  const session = await verifySession()
  const [profile, bio, features] = await Promise.all([
    getProfileById(id),
    getBioByUserId(id),
    getMemorialFeatures(id),
  ])

  if (!profile) notFound()

  const isOwn = canManageProfile(profile, session.user.id)
  const name = `${profile.firstName} ${profile.lastName}`
  const isEmpty = !bio || (!bio.quote && !bio.text && bio.images.length === 0)
  const paragraphs = bio?.text?.split(/\n\n+/).filter(Boolean) ?? []

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32 max-w-5xl">
        <section className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-fade-in">
          <div>
            <div className="flex items-center gap-3 md:gap-4">
              <BackButton href={`/profile/${id}`} label="Back to profile" />
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">Biography</h1>
            </div>
            <p className="text-muted-foreground mt-2">
              {isOwn ? "A life remembered through words and images." : `${name}'s life story.`}
            </p>
          </div>
          {isOwn && (
            <Button asChild className="shrink-0 self-end gap-2">
              <Link href={`/profile/${id}/bio/edit`}>
                <NotebookPen className="h-4 w-4" />
                {isEmpty ? "Write biography" : "Edit"}
              </Link>
            </Button>
          )}
        </section>

        {isEmpty ? (
          <div
            className="glass-card no-sheen rounded-2xl px-6 py-20 flex flex-col items-center justify-center gap-3 animate-fade-in"
            style={{ animationDelay: "80ms" }}
          >
            <NotebookText className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">No biography yet.</p>
            {isOwn && (
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link href={`/profile/${id}/bio/edit`}><NotebookPen className="h-4 w-4" />Write biography</Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            {bio.images.length > 0 && (
              <section className="mb-10 animate-fade-in" style={{ animationDelay: "80ms" }}>
                <Carousel opts={{ align: "start", loop: true }} className="w-full">
                  <CarouselContent className="items-center">
                    {bio.images.map((img) => {
                      const aspectClass =
                        img.aspect === "portrait"
                          ? "aspect-[3/4]"
                          : img.aspect === "landscape"
                            ? "aspect-[16/9]"
                            : "aspect-square"
                      return (
                        <CarouselItem key={img.id} className="basis-full md:basis-2/3 lg:basis-1/2">
                          <div className="glass-card no-sheen p-2">
                            <div className={`${aspectClass} overflow-hidden rounded-2xl bg-muted/40`}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={img.url} alt="Biography photo" className="h-full w-full object-cover" loading="lazy" />
                            </div>
                          </div>
                        </CarouselItem>
                      )
                    })}
                  </CarouselContent>
                  <CarouselPrevious className="hidden md:flex -left-4" />
                  <CarouselNext className="hidden md:flex -right-4" />
                </Carousel>
              </section>
            )}

            {bio.quote && (
              <section
                className="mb-10 glass-card bg-gradient-brand-soft px-6 py-8 md:px-10 md:py-12 animate-fade-in"
                style={{ animationDelay: "160ms" }}
              >
                <div className="flex gap-4 md:gap-6">
                  <Quote className="h-8 w-8 md:h-10 md:w-10 shrink-0 text-[hsl(var(--brand-indigo-deep))] dark:text-[hsl(var(--brand-slate-soft))]" />
                  <p className="text-xl md:text-3xl font-medium leading-snug tracking-tight">{bio.quote}</p>
                </div>
              </section>
            )}

            {paragraphs.length > 0 && (
              <section
                className="glass-card no-sheen px-6 py-8 md:px-10 md:py-10 animate-fade-in"
                style={{ animationDelay: "240ms" }}
              >
                <div className="space-y-4 text-base md:text-lg leading-relaxed text-foreground/90">
                  {paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {isOwn && (
          <div className="mt-10">
            <UpgradeHint context="bio" currentTier={features.code} />
          </div>
        )}
      </main>
    </div>
  )
}
