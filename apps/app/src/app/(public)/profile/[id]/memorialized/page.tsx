import { notFound } from "next/navigation"
import { getLocale, getTranslations } from "next-intl/server"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { MemorializedClient } from "@/components/memorialized-client"
import { type MiniProfile } from "@/components/profile-mini-card"
import { getProfileGradient } from "@/lib/avatar-color"
import { verifySession } from "@/lib/dal"
import { getProfileById } from "@/queries/profile"
import { getMemorialsByCreatorId } from "@/queries/memorial"
import { prisma } from "@/lib/prisma"
import { UpgradeHint } from "@/components/upgrade-hint"
import type { MemorialRow } from "@/queries/memorial"

interface MiniProfileContext {
  locale: string
  fallbackSubtitle: string
  bornLabel: (date: string) => string
}

function toMiniProfile(m: MemorialRow, ctx: MiniProfileContext): MiniProfile {
  return {
    id: m.id,
    name: `${m.firstName} ${m.lastName}`,
    subtitle: m.birthPlace
      ? `${m.birthPlace}${m.birthCountry ? `, ${m.birthCountry}` : ""}`
      : ctx.fallbackSubtitle,
    // status is a discriminator consumed by the shared ProfileMiniCard (not owned here); kept as the literal value
    status: "Memorialized",
    metric: m.deathDate
      ? `✦ ${m.deathDate.toLocaleDateString(ctx.locale, { year: "numeric", month: "short", day: "numeric" })}`
      : m.birthDate
        ? ctx.bornLabel(m.birthDate.toLocaleDateString(ctx.locale, { year: "numeric", month: "short" }))
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
  const t = await getTranslations("Memorialized")
  const locale = await getLocale()

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

  const name = `${profile.firstName} ${profile.lastName}`

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

  const miniProfileCtx: MiniProfileContext = {
    locale,
    fallbackSubtitle: t("card.fallbackSubtitle"),
    bornLabel: (date) => t("card.born", { date }),
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="top" />

      <main className="container relative pt-24 pb-32">
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
              <BackButton href={`/profile/${id}`} label={t("listPage.backToProfile")} />
              {/* Wraps on xs (the title is long in pt/es); single line from sm up. */}
              <h1 className="text-4xl font-semibold tracking-tight sm:whitespace-nowrap">{t("listPage.title")}</h1>
            </div>
            {memorials.length > 0 && (
              <span className="shrink-0 inline-flex items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-0.5">
                {t("listPage.profileCount", { count: memorials.length })}
              </span>
            )}
          </div>
        </div>

        <MemorializedClient
          profiles={memorials.map((m) => toMiniProfile(m, miniProfileCtx))}
          name={name}
          isOwn={isOwn}
          canCreate={canCreate}
          newHref={`/profile/${id}/memorialized/new`}
          upgradeHint={atLimit ? <UpgradeHint context="memorialized" currentTier={currentTier} /> : undefined}
        />
      </main>
    </div>
  )
}
