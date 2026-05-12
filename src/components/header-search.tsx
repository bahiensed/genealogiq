'use client'

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search, X, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface SearchResult {
  id: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  role: string
  birthPlace: string | null
  birthCountry: string | null
  deathDate: string | null
}

interface Props {
  onNavigate?: () => void
}

export function HeaderSearch({ onNavigate }: Props = {}) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 3) return
    const timer = setTimeout(async () => {
      setLoading(true)
      setOpen(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
        const data = await res.json() as SearchResult[]
        setResults(data)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const clear = () => {
    setQuery("")
    setResults([])
    setOpen(false)
    inputRef.current?.focus()
  }

  const handleSelect = (id: string) => {
    setOpen(false)
    setQuery("")
    onNavigate?.()
    router.push(`/profile/${id}`)
  }

  const showDropdown = open && query.trim().length >= 3

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="glass border-0 flex items-center gap-2 rounded-full pl-3 pr-2 h-9">
        {loading
          ? <Loader2 className="h-4 w-4 text-muted-foreground shrink-0 animate-spin" />
          : <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        }
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && clear()}
          placeholder="Search profile…"
          className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 h-7 text-sm px-0"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-border bg-popover text-popover-foreground overflow-hidden z-50 shadow-lg">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No profiles found.
            </div>
          ) : (
            <ul>
              {results.map((r, i) => {
                const initials = `${r.firstName[0]}${r.lastName[0]}`.toUpperCase()
                const isMemorialized = r.role === "APP_MEMO"
                const sub = r.birthPlace
                  ? `${r.birthPlace}${r.birthCountry ? `, ${r.birthCountry}` : ""}`
                  : isMemorialized ? "Memorialized profile" : ""
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(r.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/60 transition-colors",
                        i < results.length - 1 && "border-b border-border/40",
                      )}
                    >
                      {r.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.avatarUrl} alt={initials} className="h-9 w-9 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold shrink-0">
                          {initials}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.firstName} {r.lastName}</p>
                        <p className="text-xs text-muted-foreground truncate">{sub}</p>
                      </div>
                      {isMemorialized && (
                        <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full border border-border/60 text-muted-foreground">
                          Memorialized
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
