import { notFound } from "next/navigation"
import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { ProfileMiniCard, type MiniProfile, type AvatarGradient } from "@/components/profile-mini-card"
import { verifySession } from "@/lib/dal"
import { getProfileById } from "@/queries/profile"
import { getMemorialsByCreatorId } from "@/queries/memorial"
import type { MemorialRow } from "@/queries/memorial"

const GRADIENTS: AvatarGradient[] = ["indigo", "violet", "sky", "brand", "emerald", "amber", "rose"]
const MAX_MEMORIALS = 2

function toMiniProfile(m: MemorialRow, index: number): MiniProfile {
  const name = `${m.firstName} ${m.lastName}`
  const subtitle = m.birthPlace
    ? `${m.birthPlace}${m.birthCountry ? `, ${m.birthCountry}` : ""}`
    : "Memorialized profile"
  const metric = m.deathDate
    ? `✦ ${m.deathDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`
    : m.birthDate
      ? `Born ${m.birthDate.toLocaleDateString("en-US", { year: "numeric", month: "short" })}`
      : ""
  return {
    id: m.id,
    name,
    subtitle,
    status: "Memorialized",
    metric,
    initials: `${m.firstName[0]}${m.lastName[0]}`.toUpperCase(),
    gradient: GRADIENTS[index % GRADIENTS.length],
    href: `/profile/${m.id}`,
  }
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function MemorializedPage({ params }: Props) {
  const { id } = await params
  const session = await verifySession()

  const [profile, memorials] = await Promise.all([
    getProfileById(id),
    getMemorialsByCreatorId(id),
  ])
  if (!profile) notFound()

  const isOwn = id === session.user.id
  const canCreate = isOwn && memorials.length < MAX_MEMORIALS

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="top" />

      <main className="container relative pt-24 pb-32 max-w-6xl">
        <section className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-fade-in">
          <div>
            <div className="flex items-center gap-3 md:gap-4">
              <BackButton href={`/profile/${id}`} label="Back to profile" />
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">Profiles I guard</h1>
            </div>
            <p className="text-muted-foreground mt-2 italic">
              Memorials under your care — keepers of memory, holders of light.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            {memorials.length > 0 && (
              <span className="shrink-0 inline-flex items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-0.5">
                {memorials.length} {memorials.length === 1 ? "profile" : "profiles"}
              </span>
            )}
            {canCreate && (
              <Button asChild className="gap-2">
                <Link href={`/profile/${id}/memorialized/new`}>
                  <Plus className="h-4 w-4" />
                  New memorialized profile
                </Link>
              </Button>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {memorials.map((m, i) => (
            <ProfileMiniCard key={m.id} profile={toMiniProfile(m, i)} delay={i * 40} />
          ))}
        </section>

        {memorials.length === 0 && isOwn && (
          <div className="glass-card flex flex-col items-center justify-center gap-3 py-20 text-center animate-fade-in">
            <p className="text-muted-foreground">No memorialized profiles yet.</p>
            <Button asChild className="gap-2">
              <Link href={`/profile/${id}/memorialized/new`}>
                <Plus className="h-4 w-4" />New memorialized profile
              </Link>
            </Button>
          </div>
        )}

        {memorials.length === 0 && !isOwn && (
          <div className="glass-card flex flex-col items-center justify-center gap-3 py-20 text-center animate-fade-in">
            <p className="text-muted-foreground">No memorialized profiles guarded yet.</p>
          </div>
        )}
      </main>
    </div>
  )
}
