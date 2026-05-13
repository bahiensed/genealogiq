import { notFound } from "next/navigation"
import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { ProfileMiniCard, type MiniProfile } from "@/components/profile-mini-card"
import { getProfileGradient } from "@/lib/avatar-color"
import { verifySession } from "@/lib/dal"
import { getProfileById } from "@/queries/profile"
import { getMemorialsByCreatorId } from "@/queries/memorial"
import { prisma } from "@/lib/prisma"
import { UpgradeHint } from "@/components/upgrade-hint"
import type { MemorialRow } from "@/queries/memorial"

function toMiniProfile(m: MemorialRow): MiniProfile {
  return {
    id: m.id,
    name: `${m.firstName} ${m.lastName}`,
    subtitle: m.birthPlace
      ? `${m.birthPlace}${m.birthCountry ? `, ${m.birthCountry}` : ""}`
      : "Memorialized profile",
    status: "Memorialized",
    metric: m.deathDate
      ? `✦ ${m.deathDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`
      : m.birthDate
        ? `Born ${m.birthDate.toLocaleDateString("en-US", { year: "numeric", month: "short" })}`
        : "",
    initials: `${m.firstName[0]}${m.lastName[0]}`.toUpperCase(),
    gradient: getProfileGradient(m.id),
    href: `/profile/${m.id}`,
    avatarUrl: m.avatarUrl,
  }
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function MemorializedPage({ params }: Props) {
  const { id } = await params
  const session = await verifySession()

  const [profile, memorials, sales] = await Promise.all([
    getProfileById(id),
    getMemorialsByCreatorId(id),
    prisma.appSale.findMany({
      where: { appUserId: id },
      select: {
        subscription: { select: { code: true, maxProfiles: true } },
        _count: { select: { assignedTo: true } },
      },
    }),
  ])
  if (!profile) notFound()

  const availableSlots = sales.reduce(
    (sum, s) => sum + Math.max(0, s.subscription.maxProfiles - s._count.assignedTo),
    0,
  )

  const isOwn = id === session.user.id
  // Free tier: every user gets 1 memorial slot for free; beyond that requires a paid sale slot.
  const canCreate = isOwn && (availableSlots > 0 || memorials.length === 0)

  // Highest tier the user already owns drives the upgrade hint visibility.
  const ownsCentury = sales.some((s) => s.subscription.code === "CENTURY")
  const currentTier = ownsCentury ? "CENTURY" : "FREE"

  const atLimit = isOwn && !canCreate

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="top" />

      <main className="container relative pt-24 pb-32 max-w-6xl">
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
              <BackButton href={`/profile/${id}`} label="Back to profile" />
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight whitespace-nowrap">Guarded profiles</h1>
            </div>
            {memorials.length > 0 && (
              <span className="shrink-0 inline-flex items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-0.5">
                {memorials.length} {memorials.length === 1 ? "profile" : "profiles"}
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 bg-transparent">
            <div className="flex flex-col gap-1 min-w-0 bg-transparent">
              <p className="text-muted-foreground italic">
                Memorials watched over with love and care
              </p>
              {atLimit && <UpgradeHint context="memorialized" currentTier={currentTier} />}
            </div>
            {canCreate && (
              <Button asChild className="shrink-0 self-end lg:self-auto gap-2">
                <Link href={`/profile/${id}/memorialized/new`}>
                  <Plus className="h-4 w-4" />
                  New memorialized profile
                </Link>
              </Button>
            )}
          </div>
        </div>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {memorials.map((m, i) => (
            <ProfileMiniCard key={m.id} profile={toMiniProfile(m)} delay={i * 40} />
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
