"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { ArrowDownUp, Plus } from "lucide-react"
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
          <p className="text-muted-foreground italic">Memorials watched over with love and care</p>
          {upgradeHint}
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto">
          {!isEmpty && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <ArrowDownUp className="h-4 w-4" />
                  {sort === "az" ? "A → Z" : "Z → A"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSort("az")}>A → Z</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSort("za")}>Z → A</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {canCreate && (
            <Button asChild className="gap-2">
              <Link href={newHref}>
                <Plus className="h-4 w-4" />
                New memorialized profile
              </Link>
            </Button>
          )}
        </div>
      </section>

      {isEmpty ? (
        <div className="glass-card flex flex-col items-center justify-center gap-3 py-20 text-center animate-fade-in">
          <p className="text-muted-foreground">
            {isOwn ? "No memorialized profiles yet." : "No memorialized profiles guarded yet."}
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
