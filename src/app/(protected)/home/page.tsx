import Link from "next/link"
import { Clock, Heart, BrickWall, User, ArrowRight } from "lucide-react"
import { verifySession } from "@/lib/dal"
import { GlassIcon } from "@/components/glass-icon"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { ProfileMiniCard, type MiniProfile } from "@/components/profile-mini-card"
import { getProfileGradient } from "@/lib/avatar-color"
import { HomeSearch } from "@/components/home-search"
import { RecentlyViewedSection } from "@/components/recently-viewed-section"
import { RecentlyViewedCount } from "@/components/recently-viewed-count"
import { Greeting } from "@/components/greeting"
import { ScanQrButton } from "@/components/scan-qr-button"
import { prisma } from "@/lib/prisma"
import { getFavoritesByUserId, type FavoriteRow } from "@/queries/favorite"
import { getMemorialsByCreatorId, type MemorialRow } from "@/queries/memorial"

function favToMiniProfile(fav: FavoriteRow): MiniProfile {
  const t = fav.target
  const isMemorialized = t.role === "APP_MEMO"
  return {
    id: t.id,
    name: `${t.firstName} ${t.lastName}`,
    subtitle: t.birthPlace
      ? `${t.birthPlace}${t.birthCountry ? `, ${t.birthCountry}` : ""}`
      : isMemorialized ? "Memorialized profile" : "",
    status: isMemorialized ? "Memorialized" : "Living",
    metric: isMemorialized && t.deathDate
      ? `✦ ${t.deathDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`
      : t.birthDate
        ? `Born ${t.birthDate.toLocaleDateString("en-US", { year: "numeric", month: "short" })}`
        : "",
    initials: `${t.firstName[0]}${t.lastName[0]}`.toUpperCase(),
    gradient: getProfileGradient(t.id),
    href: `/profile/${t.id}`,
    avatarUrl: t.avatarUrl,
  }
}

function memToMiniProfile(m: MemorialRow): MiniProfile {
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

export default async function HomePage() {
  const session = await verifySession()
  const userId = session.user.id

  const [favorites, memorials, currentUser] = await Promise.all([
    getFavoritesByUserId(userId),
    getMemorialsByCreatorId(userId),
    prisma.appUser.findUnique({ where: { id: userId }, select: { firstName: true } }),
  ])

  const firstName = currentUser?.firstName ?? "there"

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop />

      <main className="container relative pt-24 pb-32">
        {/* Hero */}
        <section className="mb-10 animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
            <Greeting firstName={firstName} />
          </h1>
          <p className="text-base md:text-lg text-muted-foreground mt-3 max-w-xl">
            Scan, search & visit a profile
          </p>
        </section>

        {/* Action row */}
        <section className="relative z-10 mb-8 flex flex-col-reverse lg:flex-row gap-3 md:gap-4 animate-fade-in" style={{ animationDelay: "80ms" }}>
          <HomeSearch />

          <ScanQrButton />
        </section>

        {/* Quick actions */}
        <section className="mb-[4.5rem] grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in" style={{ animationDelay: "160ms" }}>
          <Link href="/profile" className="glass-card flex items-center gap-3 px-4 py-3">
            <GlassIcon icon={User} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight truncate">My Profile</p>
              <p className="text-xs text-muted-foreground truncate">View your page</p>
            </div>
          </Link>

          <a href="#recently-viewed" className="glass-card flex items-center gap-3 px-4 py-3">
            <GlassIcon icon={Clock} size="sm" />
            <div className="min-w-0">
              <p className="text-lg font-semibold leading-tight"><RecentlyViewedCount /></p>
              <p className="text-xs text-muted-foreground truncate">recently viewed</p>
            </div>
          </a>

          <a href="#favorites" className="glass-card flex items-center gap-3 px-4 py-3">
            <GlassIcon icon={Heart} size="sm" />
            <div className="min-w-0">
              <p className="text-lg font-semibold leading-tight">{favorites.length}</p>
              <p className="text-xs text-muted-foreground truncate">favorites</p>
            </div>
          </a>

          <a href="#guarded" className="glass-card flex items-center gap-3 px-4 py-3">
            <GlassIcon icon={BrickWall} size="sm" />
            <div className="min-w-0">
              <p className="text-lg font-semibold leading-tight">{memorials.length}</p>
              <p className="text-xs text-muted-foreground truncate">guarded</p>
            </div>
          </a>
        </section>

        {/* Recently viewed — client-side (localStorage) */}
        <HomeSection
          id="recently-viewed"
          icon={Clock}
          title="Recently viewed"
          subtitle="Recently viewed profiles appear here"
          delay={200}
        >
          <RecentlyViewedSection />
        </HomeSection>

        {/* My favorites */}
        <HomeSection
          id="favorites"
          icon={Heart}
          title="My favorites"
          subtitle="The ones closest to the heart"
          delay={260}
          seeMoreHref={`/profile/${userId}/favorites`}
          emptyIcon={Heart}
          emptyText="No favorite profile yet."
        >
          {favorites.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.slice(0, 6).map((fav, i) => (
                <ProfileMiniCard
                  key={fav.targetId}
                  profile={favToMiniProfile(fav)}
                  delay={i * 40}
                  hideLivingBadge={fav.target.role !== "APP_MEMO"}
                />
              ))}
            </div>
          ) : undefined}
        </HomeSection>

        {/* Profiles I guard */}
        <HomeSection
          id="guarded"
          icon={BrickWall}
          title="Profiles I guard"
          subtitle="Memorials watched over with quiet care."
          delay={320}
          seeMoreHref={`/profile/${userId}/memorialized`}
          emptyIcon={BrickWall}
          emptyText="No guarded profile yet."
        >
          {memorials.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {memorials.slice(0, 6).map((m, i) => (
                <ProfileMiniCard key={m.id} profile={memToMiniProfile(m)} delay={i * 40} />
              ))}
            </div>
          ) : undefined}
        </HomeSection>
      </main>
    </div>
  )
}

interface HomeSectionProps {
  id: string
  icon: typeof Clock
  title: string
  subtitle: string
  delay: number
  seeMoreHref?: string
  emptyIcon?: typeof Clock
  emptyText?: string
  children?: React.ReactNode
}

function HomeSection({ id, icon, title, subtitle, delay, seeMoreHref, emptyIcon: EmptyIcon, emptyText, children }: HomeSectionProps) {
  return (
    <section id={id} className="mb-[3.75rem] animate-fade-in scroll-mt-24" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-end justify-between mb-4 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <GlassIcon icon={icon} size="sm" />
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight truncate">{title}</h2>
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          </div>
        </div>
        {seeMoreHref && (
          <Link
            href={seeMoreHref}
            className="shrink-0 inline-flex items-center gap-1 text-sm font-medium text-[hsl(var(--brand-indigo-deep))] dark:text-[hsl(var(--brand-slate-soft))] hover:opacity-80 transition-opacity"
          >
            See all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      {children ?? (
        EmptyIcon && emptyText ? (
          <div className="glass-card no-sheen px-6 py-10 flex flex-col items-center justify-center gap-3 text-center">
            <EmptyIcon className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{emptyText}</p>
          </div>
        ) : null
      )}
    </section>
  )
}
