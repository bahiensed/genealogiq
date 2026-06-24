"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { ArrowDownUp, Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ProfileMiniCard, type MiniProfile } from "@/components/profile-mini-card"

type SortDir = "az" | "za"

interface Props {
  profiles:     MiniProfile[]
  isOwn:        boolean
  canCreate:    boolean
  newHref:      string
  upgradeHint?: ReactNode
}

export function MemorializedClient({ profiles, isOwn, canCreate, newHref, upgradeHint }: Props) {
  const t = useTranslations("Memorialized")
  const [sort, setSort] = useState<SortDir>("az")
  const isEmpty = profiles.length === 0

  const sorted = [...profiles].sort((a, b) => {
    const cmp = a.name.localeCompare(b.name)
    return sort === "az" ? cmp : -cmp
  })

  return (
    <>
      <section className="mb-8 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 animate-fade-in">
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-muted-foreground italic">{t("list.tagline")}</p>
          {upgradeHint}
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto">
          {!isEmpty && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2" aria-label={t("list.sortAria")}>
                  <ArrowDownUp className="h-4 w-4" />
                  {sort === "az" ? t("list.sortAsc") : t("list.sortDesc")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSort("az")}>{t("list.sortAsc")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSort("za")}>{t("list.sortDesc")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {canCreate && (
            <Button asChild className="gap-2">
              <Link href={newHref}>
                <Plus className="h-4 w-4" />
                {t("list.newProfile")}
              </Link>
            </Button>
          )}
        </div>
      </section>

      {isEmpty ? (
        <div className="glass-card flex flex-col items-center justify-center gap-3 py-20 text-center animate-fade-in">
          <p className="text-muted-foreground">
            {isOwn ? t("list.emptyOwn") : t("list.emptyGuarded")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: "80ms" }}>
          {sorted.map((p, i) => (
            <ProfileMiniCard key={p.id} profile={p} delay={i * 40} />
          ))}
        </div>
      )}
    </>
  )
}
