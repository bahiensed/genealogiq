import type { ReactNode } from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowUpRight } from "lucide-react"
import { GlassIcon } from "@/components/glass-icon"
import { QrCardGate } from "@/components/qr-card-gate"
import { SignupGate } from "@/components/auth/signup-gate"
import { cn } from "@/lib/utils"

export interface SectionCard {
  key: string
  title: string
  description: string
  metric: string
  icon: LucideIcon
  span?: 2 | 3 | 4 | 6
  preview?: ReactNode
  href?: string
  gated?: boolean
  // Which dialog a gated card opens: "qr" (purchase, default) or "signup" (anon lock).
  gate?: "qr" | "signup"
}

interface Props {
  cards: SectionCard[]
}

const spanClass: Record<NonNullable<SectionCard["span"]>, string> = {
  2: "lg:col-span-2",
  3: "lg:col-span-3",
  4: "lg:col-span-4",
  6: "lg:col-span-6",
}

export function BentoGrid({ cards }: Props) {
  return (
    <section className="container mt-12 sm:mt-14 md:mt-14 lg:mt-12 mb-24">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 md:gap-5">
        {cards.map((card, i) => {
          const inner = (
            <>
              <div className="flex items-start justify-between">
                <GlassIcon icon={card.icon} size="md" />
                <ArrowUpRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="mt-4 md:mt-5">
                <h3 className="text-lg md:text-xl font-semibold tracking-tight">{card.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{card.description}</p>
              </div>
              {card.preview && (
                <div className="mt-5 flex-1 min-h-0 flex items-stretch">
                  <div className="w-full">{card.preview}</div>
                </div>
              )}
              <p className="mt-5 text-[11px] font-semibold text-primary uppercase tracking-[0.12em]">
                {card.metric}
              </p>
            </>
          )

          const className = cn(
            "glass-card group text-left p-6 md:p-7 flex flex-col min-h-[280px] md:min-h-[320px] animate-fade-in",
            "sm:col-span-1",
            card.span && spanClass[card.span],
          )

          if (card.gated) {
            const GateComponent = card.gate === "signup" ? SignupGate : QrCardGate
            return (
              <GateComponent
                key={card.key}
                className={cn(className, "text-left")}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {inner}
              </GateComponent>
            )
          }

          if (card.href) {
            return (
              <Link
                key={card.key}
                href={card.href}
                className={className}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {inner}
              </Link>
            )
          }

          return (
            <div
              key={card.key}
              className={cn(className, "cursor-default")}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {inner}
            </div>
          )
        })}
      </div>
    </section>
  )
}
