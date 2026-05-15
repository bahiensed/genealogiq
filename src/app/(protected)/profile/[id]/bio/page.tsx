import Link from "next/link"
import { notFound } from "next/navigation"
import { NotebookText, NotebookPen, Quote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { BioImageCarousel } from "@/components/bio-image-carousel"
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
  const textLen = bio?.text?.length ?? 0
  const imageCount = bio?.images.length ?? 0
  const atLimit = textLen >= features.bioMaxChars || imageCount >= features.bioMaxImages

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32 max-w-6xl">
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
              <BackButton href={`/profile/${id}`} label="Back to profile" />
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight whitespace-nowrap">Biography</h1>
            </div>
            {isOwn && (
              <Button asChild className="shrink-0 gap-2">
                <Link href={`/profile/${id}/bio/edit`}>
                  <NotebookPen className="h-4 w-4" />
                  {isEmpty ? "Write biography" : "Edit"}
                </Link>
              </Button>
            )}
          </div>
          <p className="text-muted-foreground mt-2 italic">
            {isOwn ? "A life remembered through words and images" : `${name}'s life story`}
          </p>
          {isOwn && atLimit && (
            <div className="mt-2">
              <UpgradeHint context="bio" currentTier={features.code} />
            </div>
          )}
        </div>

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
                <BioImageCarousel images={bio.images} />
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
      </main>
    </div>
  )
}
