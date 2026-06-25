'use client'

import { useState, useTransition, useRef } from "react"
import { useTranslations } from "next-intl"
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { addRelation, addGhostRelative } from "@/actions/family-tree"
import { SPOUSE_SUBTYPES, type SpouseSubtype } from "@/schemas/family-tree"

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

interface ExistingParent {
  id:   string
  name: string
}

interface Props {
  open: boolean
  onClose: () => void
  anchorId: string
  rootId: string
  initialKind?: RelationKind
  /** Existing parents of the anchor — used to offer the "Married to X" checkbox when adding a 2nd parent. */
  anchorParents?: ExistingParent[]
  onSuccess?: () => void
}

const KIND_ORDER: RelationKind[] = ["parent", "spouse", "sibling", "child"]

const KIND_TO_TYPE: Record<RelationKind, "PARENT_OF" | "SPOUSE" | "SIBLING"> = {
  parent: "PARENT_OF", child: "PARENT_OF", spouse: "SPOUSE", sibling: "SIBLING",
}

function genderRingClass(gender: string | null) {
  if (gender === "FEMALE") return "ring-rose-400/50"
  if (gender === "MALE")   return "ring-[hsl(var(--brand-indigo)/0.5)]"
  return "ring-border/40"
}

export function AddRelativeDialog({ open, onClose, anchorId, rootId, initialKind = "parent", anchorParents = [], onSuccess }: Props) {
  const t = useTranslations("FamilyTree")
  const tc = useTranslations("Common")
  const [isPending, startTransition] = useTransition()
  const [mode, setMode]   = useState<Mode>("search")
  const [kind, setKind]   = useState<RelationKind>(initialKind)
  const [spouseSubtype, setSpouseSubtype] = useState<SpouseSubtype>("married")
  const [marriedAt, setMarriedAt] = useState("")
  const [endedAt, setEndedAt] = useState("")
  const [linkSpouse, setLinkSpouse] = useState(true)
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
        fromId, toId, type,
        subtype:   kind === "spouse" ? spouseSubtype : null,
        startDate: kind === "spouse" && marriedAt ? marriedAt : null,
        endDate:   kind === "spouse" && needsEndDate && endedAt ? endedAt : null,
        linkSpouseId: shouldLinkSpouse ? anchorParents[0]?.id : null,
      })
      if (!result.ok) { toast.error(result.message); return }
      toast.success(t("toasts.relativeAdded"))
      handleClose()
      onSuccess?.()
    })
  }

  const handleConfirmGhost = () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error(t("toasts.nameRequired"))
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
        anchorId, kind,
        subtype:   kind === "spouse" ? spouseSubtype : null,
        startDate: kind === "spouse" && marriedAt ? marriedAt : null,
        endDate:   kind === "spouse" && needsEndDate && endedAt ? endedAt : null,
        linkSpouseId: shouldLinkSpouse ? anchorParents[0]?.id : null,
      })
      if (!result.ok) { toast.error(result.message); return }
      toast.success(t("toasts.personAdded"))
      handleClose()
      onSuccess?.()
    })
  }

  const handleClose = () => {
    onClose()
    setMode("search")
    setQuery(""); setResults([]); setSelected(null)
    setKind(initialKind)
    setSpouseSubtype("married")
    setMarriedAt("")
    setEndedAt("")
    setLinkSpouse(true)
    setFirstName(""); setLastName(""); setMaidenName("")
    setNickname("")
    setGender(""); setBirthDate(""); setDeathDate("")
  }

  const showNoResults = !loading && results.length === 0 && query.length >= 3
  const showSpouseLink = kind === "parent" && anchorParents.length > 0
  const shouldLinkSpouse = showSpouseLink && linkSpouse
  const needsEndDate = spouseSubtype === "divorced" || spouseSubtype === "widowed"
  const startLabel = spouseSubtype === "partner" ? t("addRelative.togetherSince") : t("addRelative.married")
  const endLabel   = spouseSubtype === "widowed" ? t("addRelative.widowed") : t("addRelative.divorced")

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
                  aria-label={t("addRelative.backToSearch")}
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                {t("addRelative.newPersonTitle")}
              </span>
            ) : t("addRelative.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-2 items-end">
            <div className="space-y-1.5">
              <Label>{t("addRelative.kindLabel")}</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as RelationKind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KIND_ORDER.map((k) => (
                    <SelectItem key={k} value={k}>{t(`kinds.${k}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {kind === "spouse" && (
              <div className="space-y-1.5">
                <Label>{t("addRelative.typeLabel")}</Label>
                <Select value={spouseSubtype} onValueChange={(v) => setSpouseSubtype(v as SpouseSubtype)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SPOUSE_SUBTYPES.map((s) => (
                      <SelectItem key={s} value={s}>{t(`subtypes.${s}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {kind === "spouse" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="rel-start">{startLabel}:</Label>
                <Input id="rel-start" type="date" value={marriedAt} onChange={(e) => setMarriedAt(e.target.value)} />
              </div>
              {needsEndDate && (
                <div className="space-y-1.5">
                  <Label htmlFor="rel-end">{endLabel}:</Label>
                  <Input id="rel-end" type="date" value={endedAt} onChange={(e) => setEndedAt(e.target.value)} />
                </div>
              )}
            </div>
          )}

          {showSpouseLink && (
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <Checkbox checked={linkSpouse} onCheckedChange={(v) => setLinkSpouse(v === true)} />
              <span>
                {t.rich("addRelative.marriedTo", {
                  name: anchorParents[0].name,
                  strong: (chunks) => <span className="font-medium">{chunks}</span>,
                })}
              </span>
            </label>
          )}

          {mode === "search" ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder={t("addRelative.searchPlaceholder")} value={query} onChange={(e) => handleSearch(e.target.value)} />
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
                            {isMemorialized && <p className="text-[10px] text-muted-foreground italic">{t("memorialized")}</p>}
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              )}

              {showNoResults && <p className="text-sm text-center text-muted-foreground py-2">{t("addRelative.noResults")}</p>}

              <button
                type="button"
                onClick={() => setMode("create")}
                className="w-full inline-flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline pt-1"
              >
                <UserPlus className="h-4 w-4" />
                {t("addRelative.addNewPerson")}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="g-first">{t("fields.firstName")}</Label>
                  <Input id="g-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={64} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="g-last">{t("fields.lastName")}</Label>
                  <Input id="g-last" value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={64} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="g-maiden">{t("fields.maidenName")}</Label>
                  <Input id="g-maiden" value={maidenName} onChange={(e) => setMaidenName(e.target.value)} maxLength={64} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="g-nick">{t("fields.nickname")}</Label>
                  <Input id="g-nick" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={40} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("fields.gender")}</Label>
                <Select value={gender} onValueChange={(v) => setGender(v as "MALE" | "FEMALE" | "OTHER")}>
                  <SelectTrigger><SelectValue placeholder={t("fields.genderSelect")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FEMALE">{t("gender.female")}</SelectItem>
                    <SelectItem value="MALE">{t("gender.male")}</SelectItem>
                    <SelectItem value="OTHER">{t("gender.other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="g-birth">{t("fields.birthDate")}</Label>
                  <Input id="g-birth" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="g-death">{t("fields.deathDate")}</Label>
                  <Input id="g-death" type="date" value={deathDate} onChange={(e) => setDeathDate(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("addRelative.ghostHint")}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>{tc("cancel")}</Button>
          {mode === "search" ? (
            <Button onClick={handleConfirmExisting} disabled={!selected || isPending}>{tc("add")}</Button>
          ) : (
            <Button onClick={handleConfirmGhost} disabled={isPending}>
              {isPending ? tc("saving") : t("addRelative.addToTree")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
