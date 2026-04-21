import Link from "next/link"
import { Search, QrCode, Clock, Heart, BrickWall, User, ArrowRight } from "lucide-react"
import { verifySession } from "@/lib/dal"
import { GlassIcon } from "@/components/glass-icon"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { Input } from "@/components/ui/input"

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

export default async function HomePage() {
  const session = await verifySession()
  const firstName = session.user.name?.split(" ")[0] ?? "there"
  const hello = greeting()

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop />

      <main className="container relative pt-24 pb-32">
        {/* Hero */}
        <section className="mb-10 animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
            {hello}, <span className="text-gradient-brand">{firstName}</span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground mt-3 max-w-xl">
            Scan, search & visit a profile
          </p>
        </section>

        {/* Action row */}
        <section className="mb-8 flex flex-col-reverse lg:flex-row gap-3 md:gap-4 animate-fade-in" style={{ animationDelay: "80ms" }}>
          <div className="glass-card no-sheen flex-1 flex items-center gap-3 px-5 py-3">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <Input
              id="home-search"
              placeholder="Search profile by name..."
              className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 h-11 text-base px-0"
            />
          </div>

          <button
            className="glass-card flex lg:w-auto w-full items-center justify-center gap-3 px-5 py-3 group"
            aria-label="Scan QR code"
          >
            <GlassIcon icon={QrCode} size="sm" />
            <span className="lg:hidden font-medium">Scan a QR code</span>
            <span className="hidden lg:inline text-sm font-medium pr-2">Scan QR</span>
          </button>
        </section>

        {/* Quick actions */}
        <section className="mb-[4.5rem] grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in" style={{ animationDelay: "160ms" }}>
          <Link href="/profile" className="glass-card-deep flex items-center gap-3 px-4 py-3">
            <GlassIcon icon={User} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight truncate">My Profile</p>
              <p className="text-xs text-muted-foreground truncate">View your page</p>
            </div>
          </Link>

          <a href="#recently-viewed" className="glass-card-deep flex items-center gap-3 px-4 py-3">
            <GlassIcon icon={Clock} size="sm" />
            <div className="min-w-0">
              <p className="text-lg font-semibold leading-tight">0</p>
              <p className="text-xs text-muted-foreground truncate">recently viewed</p>
            </div>
          </a>

          <a href="#favorites" className="glass-card-deep flex items-center gap-3 px-4 py-3">
            <GlassIcon icon={Heart} size="sm" />
            <div className="min-w-0">
              <p className="text-lg font-semibold leading-tight">0</p>
              <p className="text-xs text-muted-foreground truncate">favorites</p>
            </div>
          </a>

          <a href="#guarded" className="glass-card-deep flex items-center gap-3 px-4 py-3">
            <GlassIcon icon={BrickWall} size="sm" />
            <div className="min-w-0">
              <p className="text-lg font-semibold leading-tight">0</p>
              <p className="text-xs text-muted-foreground truncate">guarded</p>
            </div>
          </a>
        </section>

        {/* Sections — empty states until profile data exists */}
        <EmptySection id="recently-viewed" icon={Clock} title="Recently viewed" subtitle="Profiles you've visited will appear here" delay={200} />
        <EmptySection id="favorites" icon={Heart} title="My favorites" subtitle="The ones closest to your heart" delay={260} seeMoreHref="/favorites" />
        <EmptySection id="guarded" icon={BrickWall} title="Profiles I guard" subtitle="Memorials under your care" delay={320} seeMoreHref="/memorialized" />
      </main>
    </div>
  )
}

interface EmptySectionProps {
  id: string
  icon: typeof Clock
  title: string
  subtitle: string
  delay: number
  seeMoreHref?: string
}

function EmptySection({ id, icon, title, subtitle, delay, seeMoreHref }: EmptySectionProps) {
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
      <div className="glass-card no-sheen rounded-2xl px-6 py-10 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Nothing here yet</p>
      </div>
    </section>
  )
}
