'use client'

import { useState, useTransition, useRef } from "react"
import { Search, User } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { addRelation } from "@/actions/family-tree"

type RelationKind = "parent" | "spouse" | "sibling" | "child"

interface SearchResult {
  id: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  gender: string | null
  role: string
  deathDate: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  anchorId: string
  rootId: string
  onSuccess?: () => void
}

const RELATION_LABELS: Record<RelationKind, string> = {
  parent:  "Parent",
  spouse:  "Spouse / partner",
  sibling: "Sibling",
  child:   "Child",
}

function genderRingClass(gender: string | null) {
  if (gender === "female") return "ring-rose-400/50"
  if (gender === "male")   return "ring-[hsl(var(--brand-indigo)/0.5)]"
  return "ring-border/40"
}

export function AddRelativeDialog({ open, onClose, anchorId, rootId, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition()
  const [kind, setKind] = useState<RelationKind>("parent")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearch = (value: string) => {
    setQuery(value)
    setSelected(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`)
        const data = await res.json() as SearchResult[]
        setResults(data)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  const handleConfirm = () => {
    if (!selected) return
    startTransition(async () => {
      let fromId: string
      let toId: string
      let type: "PARENT_OF" | "SPOUSE" | "SIBLING"

      if (kind === "parent") {
        fromId = selected.id; toId = anchorId; type = "PARENT_OF"
      } else if (kind === "child") {
        fromId = anchorId; toId = selected.id; type = "PARENT_OF"
      } else if (kind === "sibling") {
        fromId = anchorId; toId = selected.id; type = "SIBLING"
      } else {
        fromId = anchorId; toId = selected.id; type = "SPOUSE"
      }

      const result = await addRelation(rootId, { fromId, toId, type })
      if (result?.error) { toast.error(result.error); return }

      toast.success("Relative added.")
      handleClose()
      onSuccess?.()
    })
  }

  const handleClose = () => {
    onClose()
    setQuery("")
    setResults([])
    setSelected(null)
    setKind("parent")
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a relative</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Relation type */}
          <div className="space-y-1.5">
            <Label>Relation type</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as RelationKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(RELATION_LABELS) as [RelationKind, string][]).map(([k, label]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="space-y-1.5">
            <Label>Search profile</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Name..."
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>

            {(!loading && results.length === 0 && query.length >= 3) && (
              <p className="text-sm text-center text-muted-foreground py-3">No results found.</p>
            )}

            {(results.length > 0 || loading) && (
              <div className="border border-border/60 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                {loading ? (
                  <div className="py-6 flex items-center justify-center">
                    <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  </div>
                ) : (
                  results.map((r) => {
                    const name = `${r.firstName} ${r.lastName}`
                    const isSelected = selected?.id === r.id
                    const isMemorialized = r.role === "APP_MEMO"
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelected(r)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent/60 transition-colors",
                          isSelected && "bg-accent"
                        )}
                      >
                        <div className={cn(
                          "h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden ring-2",
                          genderRingClass(r.gender)
                        )}>
                          {r.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={r.avatarUrl}
                              alt={name}
                              className={cn("h-full w-full object-cover", isMemorialized && "saturate-50")}
                            />
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{name}</p>
                          {isMemorialized && (
                            <p className="text-[10px] text-muted-foreground italic">Memorialized</p>
                          )}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            )}

            {selected && (
              <p className="text-xs text-muted-foreground">
                Selected: <span className="font-medium text-foreground">{selected.firstName} {selected.lastName}</span>
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!selected || isPending}>
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
