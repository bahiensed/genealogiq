'use client'

import { useState, useTransition, useRef } from "react"
import { Search, User, UserPlus, ArrowLeft } from "lucide-react"
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
import { addRelation, addGhostRelative } from "@/actions/family-tree"
import {
  PARENT_OF_SUBTYPES,
  SPOUSE_SUBTYPES,
  SIBLING_SUBTYPES,
} from "@/schemas/family-tree"

type RelationKind = "parent" | "spouse" | "sibling" | "child"
type Mode = "search" | "create"

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
  initialKind?: RelationKind
  onSuccess?: () => void
}

const KIND_LABELS: Record<RelationKind, string> = {
  parent:  "Parent",
  spouse:  "Spouse / partner",
  sibling: "Sibling",
  child:   "Child",
}

const KIND_TO_TYPE: Record<RelationKind, "PARENT_OF" | "SPOUSE" | "SIBLING"> = {
  parent: "PARENT_OF", child: "PARENT_OF", spouse: "SPOUSE", sibling: "SIBLING",
}

const subtypesFor = (kind: RelationKind): readonly string[] => {
  const type = KIND_TO_TYPE[kind]
  if (type === "SPOUSE")  return SPOUSE_SUBTYPES
  if (type === "SIBLING") return SIBLING_SUBTYPES
  return PARENT_OF_SUBTYPES
}

const defaultSubtype = (kind: RelationKind): string => subtypesFor(kind)[0]

function genderRingClass(gender: string | null) {
  if (gender === "FEMALE") return "ring-rose-400/50"
  if (gender === "MALE")   return "ring-[hsl(var(--brand-indigo)/0.5)]"
  return "ring-border/40"
}

export function AddRelativeDialog({ open, onClose, anchorId, rootId, initialKind = "parent", onSuccess }: Props) {
  const [isPending, startTransition] = useTransition()
  const [mode, setMode]   = useState<Mode>("search")
  const [kind, setKind]   = useState<RelationKind>(initialKind)
  const [subtype, setSubtype] = useState<string>(defaultSubtype(initialKind))
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate]     = useState("")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [loading, setLoading]   = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Ghost form
  const [firstName, setFirstName]   = useState("")
  const [lastName,  setLastName]    = useState("")
  const [maidenName, setMaidenName] = useState("")
  const [nickname, setNickname]     = useState("")
  const [gender,    setGender]      = useState<"MALE" | "FEMALE" | "OTHER" | "">("")
  const [birthDate, setBirthDate]   = useState("")
  const [deathDate, setDeathDate]   = useState("")

  const handleKindChange = (k: RelationKind) => {
    setKind(k)
    setSubtype(defaultSubtype(k))
    if (k !== "spouse") setEndDate("")
  }

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

  const handleConfirmExisting = () => {
    if (!selected) return
    startTransition(async () => {
      let fromId: string, toId: string
      const type = KIND_TO_TYPE[kind]
      if (kind === "parent")      { fromId = selected.id; toId = anchorId }
      else if (kind === "child")  { fromId = anchorId;    toId = selected.id }
      else                        { fromId = anchorId;    toId = selected.id }

      const result = await addRelation(rootId, {
        fromId, toId, type, subtype,
        startDate: startDate || null,
        endDate:   endDate || null,
      })
      if (result?.error) { toast.error(result.error); return }
      toast.success("Relative added.")
      handleClose()
      onSuccess?.()
    })
  }

  const handleConfirmGhost = () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First and last name are required.")
      return
    }
    startTransition(async () => {
      const result = await addGhostRelative(rootId, {
        firstName, lastName,
        maidenName: maidenName || null,
        nickname:   nickname   || null,
        gender:     gender || null,
        birthDate:  birthDate || null,
        deathDate:  deathDate || null,
        anchorId, kind, subtype,
        startDate: startDate || null,
        endDate:   endDate   || null,
      })
      if (result?.error) { toast.error(result.error); return }
      toast.success("Person added to the tree.")
      handleClose()
      onSuccess?.()
    })
  }

  const handleClose = () => {
    onClose()
    setMode("search")
    setQuery(""); setResults([]); setSelected(null)
    setKind(initialKind); setSubtype(defaultSubtype(initialKind))
    setStartDate(""); setEndDate("")
    setFirstName(""); setLastName(""); setMaidenName("")
    setNickname("")
    setGender(""); setBirthDate(""); setDeathDate("")
  }

  const showNoResults = !loading && results.length === 0 && query.length >= 3
  const showDates = kind === "spouse" || (kind === "parent" && (subtype === "adopted" || subtype === "step")) || (kind === "child" && (subtype === "adopted" || subtype === "step"))
  const showEndDate = kind === "spouse" && (subtype === "divorced" || subtype === "widowed")

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? (
              <span className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMode("search")}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Back to search"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                Add a new person
              </span>
            ) : "Add a relative"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Relation</Label>
              <Select value={kind} onValueChange={(v) => handleKindChange(v as RelationKind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(KIND_LABELS) as [RelationKind, string][]).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={subtype} onValueChange={setSubtype}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {subtypesFor(kind).map((s) => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(showDates || showEndDate) && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="rel-start">{kind === "spouse" ? "Married" : "Started"}</Label>
                <Input id="rel-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              {showEndDate && (
                <div className="space-y-1.5">
                  <Label htmlFor="rel-end">{subtype === "widowed" ? "Widowed" : "Ended"}</Label>
                  <Input id="rel-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              )}
            </div>
          )}

          {mode === "search" ? (
            <div className="space-y-1.5">
              <Label>Search profile</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Name..." value={query} onChange={(e) => handleSearch(e.target.value)} />
              </div>

              {(results.length > 0 || loading) && (
                <div className="border border-border/60 rounded-lg overflow-hidden max-h-44 overflow-y-auto">
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
                          className={cn("w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent/60 transition-colors", isSelected && "bg-accent")}
                        >
                          <div className={cn("h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden ring-2", genderRingClass(r.gender))}>
                            {r.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={r.avatarUrl} alt={name} className={cn("h-full w-full object-cover", isMemorialized && "saturate-50")} />
                            ) : (
                              <User className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{name}</p>
                            {isMemorialized && <p className="text-[10px] text-muted-foreground italic">Memorialized</p>}
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              )}

              {showNoResults && <p className="text-sm text-center text-muted-foreground py-2">No results found.</p>}

              <button
                type="button"
                onClick={() => setMode("create")}
                className="w-full inline-flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline pt-1"
              >
                <UserPlus className="h-4 w-4" />
                Add a new person to the tree
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="g-first">First name</Label>
                  <Input id="g-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={64} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="g-last">Last name</Label>
                  <Input id="g-last" value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={64} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="g-maiden">Maiden name <span className="text-muted-foreground">(optional)</span></Label>
                  <Input id="g-maiden" value={maidenName} onChange={(e) => setMaidenName(e.target.value)} maxLength={64} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="g-nick">Nickname <span className="text-muted-foreground">(optional)</span></Label>
                  <Input id="g-nick" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={40} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select value={gender} onValueChange={(v) => setGender(v as "MALE" | "FEMALE" | "OTHER")}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="g-birth">Birth date</Label>
                  <Input id="g-birth" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="g-death">Death date</Label>
                  <Input id="g-death" type="date" value={deathDate} onChange={(e) => setDeathDate(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                This person stays in the family tree without a profile. You can promote them to a memorialized profile later.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>Cancel</Button>
          {mode === "search" ? (
            <Button onClick={handleConfirmExisting} disabled={!selected || isPending}>Add</Button>
          ) : (
            <Button onClick={handleConfirmGhost} disabled={isPending}>
              {isPending ? "Saving…" : "Add to tree"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
