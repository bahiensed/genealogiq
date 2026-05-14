"use client"

import { useState } from "react"
import { ArrowDownUp } from "lucide-react"
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
  profiles: MiniProfile[]
}

export function MemorializedClient({ profiles }: Props) {
  const [sort, setSort] = useState<SortDir>("az")

  if (profiles.length === 0) return null

  const sorted = [...profiles].sort((a, b) => {
    const cmp = a.name.localeCompare(b.name)
    return sort === "az" ? cmp : -cmp
  })

  return (
    <>
      <div className="mb-4 flex justify-end animate-fade-in">
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
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: "80ms" }}>
        {sorted.map((p, i) => (
          <ProfileMiniCard key={p.id} profile={p} delay={i * 40} />
        ))}
      </div>
    </>
  )
}
