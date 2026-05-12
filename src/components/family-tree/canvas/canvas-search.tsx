'use client'

import { useEffect, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TreePerson } from "@/queries/family-tree"

interface Props {
  persons: Record<string, TreePerson>
  onPick:  (id: string) => void
}

export function CanvasSearch({ persons, onPick }: Props) {
  const [open, setOpen]     = useState(false)
  const [query, setQuery]   = useState("")
  const inputRef            = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return
      if (e.key === "/") {
        e.preventDefault()
        setOpen(true)
        requestAnimationFrame(() => inputRef.current?.focus())
      } else if (e.key === "Escape" && open) {
        setOpen(false)
        setQuery("")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  const q = query.trim().toLowerCase()
  const matches = q
    ? Object.values(persons)
        .filter((p) => `${p.firstName} ${p.lastName} ${p.maidenName ?? ""} ${p.nickname ?? ""}`.toLowerCase().includes(q))
        .slice(0, 5)
    : []

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); requestAnimationFrame(() => inputRef.current?.focus()) }}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-2 rounded-full bg-background/80 backdrop-blur-md border border-border/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-border transition-colors"
        title="Search the tree (/)"
      >
        <Search className="h-3.5 w-3.5" />
        Search
        <kbd className="text-[10px] font-medium px-1 py-px rounded bg-muted">/</kbd>
      </button>
    )
  }

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-[min(360px,90vw)] rounded-xl border border-border/60 bg-background/90 backdrop-blur-xl shadow-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name…"
          className="flex-1 bg-transparent border-0 text-sm focus:outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={() => { setOpen(false); setQuery("") }}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {matches.length > 0 ? (
        <ul className="max-h-56 overflow-y-auto">
          {matches.map((p) => {
            const isGhost = p.role === "APP_GHOST"
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => { onPick(p.id); setOpen(false); setQuery("") }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-accent/60 transition-colors flex items-center gap-2",
                  )}
                >
                  <span className={cn("flex-1 truncate", isGhost && "italic text-muted-foreground")}>
                    {p.firstName} {p.lastName}
                    {p.nickname && <span className="text-muted-foreground italic"> &ldquo;{p.nickname}&rdquo;</span>}
                  </span>
                  {p.birthDate && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {new Date(p.birthDate).getFullYear()}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      ) : q ? (
        <p className="px-3 py-4 text-sm text-muted-foreground text-center">No matches.</p>
      ) : null}
    </div>
  )
}
