'use client'

import { useState } from "react"
import Link from "next/link"
import { Trash2, SquarePen, Cake, Heart, HeartCrack, Flower, ArrowUpRight } from "lucide-react"
import { toast } from "sonner"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { removeMember } from "@/actions/family-tree"
import { relationFromRoot } from "@/lib/family-relation-label"
import { formatLongDate } from "@/lib/format-date"
import type { TreePerson, TreeRelation } from "@/queries/family-tree"

type Kind = "parent" | "child" | "spouse" | "sibling"

interface Props {
  open:           boolean
  onClose:        () => void
  person:         TreePerson | null
  rootId:         string
  persons:        Record<string, TreePerson>
  relations:      TreeRelation[]
  canManage:      boolean
  sessionUserId?: string
  onEdit:         () => void
  onAddRelative:  (anchorId: string, kind: Kind) => void
  onSuccess:      () => void
}

type Event =
  | { id: string; type: "BORN";       date: Date | null; place: string | null }
  | { id: string; type: "MARRIED";    date: Date | null; spouseName: string;  status: string }
  | { id: string; type: "DIVORCED";   date: Date | null; spouseName: string }
  | { id: string; type: "DIED";       date: Date | null; place: string | null }

function eventDateMs(e: Event): number {
  return e.date ? new Date(e.date).getTime() : 0
}

function buildEvents(person: TreePerson, persons: Record<string, TreePerson>, relations: TreeRelation[]): Event[] {
  const events: Event[] = []

  if (person.birthDate || person.birthPlace) {
    events.push({
      id:    `born-${person.id}`,
      type:  "BORN",
      date:  person.birthDate,
      place: person.birthPlace
        ? person.birthCountry ? `${person.birthPlace}, ${person.birthCountry}` : person.birthPlace
        : null,
    })
  }

  for (const r of relations) {
    if (r.type !== "SPOUSE") continue
    if (r.fromId !== person.id && r.toId !== person.id) continue
    const spouseId = r.fromId === person.id ? r.toId : r.fromId
    const spouse = persons[spouseId]
    if (!spouse) continue
    const name = `${spouse.firstName} ${spouse.lastName}`
    if (r.subtype === "divorced") {
      events.push({ id: `married-${r.id}`,  type: "MARRIED",  date: r.startDate, spouseName: name, status: "divorced" })
      events.push({ id: `divorced-${r.id}`, type: "DIVORCED", date: r.endDate,   spouseName: name })
    } else {
      events.push({ id: `married-${r.id}`, type: "MARRIED", date: r.startDate, spouseName: name, status: r.subtype ?? "married" })
    }
  }

  if (person.deathDate || person.deathPlace) {
    events.push({
      id:    `died-${person.id}`,
      type:  "DIED",
      date:  person.deathDate,
      place: person.deathPlace
        ? person.deathCountry ? `${person.deathPlace}, ${person.deathCountry}` : person.deathPlace
        : null,
    })
  }

  events.sort((a, b) => eventDateMs(a) - eventDateMs(b))
  return events
}

function eventIcon(type: Event["type"]) {
  if (type === "BORN")     return <Cake       className="h-3.5 w-3.5" />
  if (type === "MARRIED")  return <Heart      className="h-3.5 w-3.5" />
  if (type === "DIVORCED") return <HeartCrack className="h-3.5 w-3.5" />
  return <Flower className="h-3.5 w-3.5" />
}

function eventLabel(e: Event): string {
  if (e.type === "BORN")     return e.place ? `Born in ${e.place}` : "Born"
  if (e.type === "DIED")     return e.place ? `Died in ${e.place}` : "Died"
  if (e.type === "DIVORCED") return `Divorced from ${e.spouseName}`
  return `Married ${e.spouseName}`
}

export function PersonInfoSheet({
  open, onClose, person, rootId, persons, relations,
  canManage, onEdit, onAddRelative, onSuccess,
}: Props) {
  const [removing, setRemoving] = useState(false)

  if (!person) return null

  const isSelf      = person.id === rootId
  const isGhost     = person.role === "APP_GHOST"
  const isMemorial  = person.role === "APP_MEMO"

  // Editable = guardian-managed (your own profile, your memorial, your ghost).
  // The action does the real check; this gates the button UI.
  const canEditMember = canManage && (isGhost || isMemorial || isSelf)
  // Anyone in the tree (except the root) can be removed by a guardian.
  // Ghosts get deleted entirely; real users/memorials are just disconnected.
  const canRemoveMember = canManage && !isSelf

  const label = relationFromRoot(persons, relations, rootId, person.id)
  const displayName = person.maidenName
    ? `${person.firstName} ${person.lastName} (née ${person.maidenName})`
    : `${person.firstName} ${person.lastName}`
  const initials = `${person.firstName[0] ?? ""}${person.lastName[0] ?? ""}`.toUpperCase()

  const events = buildEvents(person, persons, relations)

  const handleRemove = async () => {
    setRemoving(true)
    const result = await removeMember(rootId, person.id)
    setRemoving(false)
    if (result?.error) { toast.error(result.error); return }
    toast.success("Removed from the tree.")
    onClose()
    onSuccess()
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent side="right" className="sm:max-w-md w-[min(420px,100vw)] p-0 overflow-y-auto">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/60">
          <div className="flex items-start gap-3">
            <div className={cn(
              "h-12 w-12 rounded-full overflow-hidden shrink-0 bg-muted flex items-center justify-center ring-2",
              person.gender === "FEMALE" ? "ring-rose-300/70" : person.gender === "MALE" ? "ring-[hsl(var(--brand-indigo)/0.55)]" : "ring-border/50",
            )}>
              {person.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={person.avatarUrl} alt={displayName} className={cn("h-full w-full object-cover", isMemorial && "saturate-50")} />
              ) : (
                <span className="text-sm font-semibold text-muted-foreground">{initials}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className={cn("text-base leading-tight text-left", isGhost && "italic")}>{displayName}</SheetTitle>
              {person.nickname && (
                <p className="text-xs italic text-muted-foreground mt-0.5">&ldquo;{person.nickname}&rdquo;</p>
              )}
              {isSelf
                ? <p className="text-xs text-primary mt-1">This is you</p>
                : label && <p className="text-xs text-primary mt-1">{label}</p>}
            </div>
          </div>
        </SheetHeader>

        {/* Edit row */}
        <div className="px-5 py-4 flex items-center justify-between gap-3 border-b border-border/60">
          <p className="text-xs text-muted-foreground leading-snug max-w-[220px]">
            {canEditMember
              ? "Update name, dates and details."
              : "You can only edit your own profile, your memorials, or people you added to the tree."}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={onEdit}
            disabled={!canEditMember}
          >
            <SquarePen className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>

        {/* Timeline */}
        {events.length > 0 && (
          <div className="px-5 py-4 border-b border-border/60">
            <h3 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Timeline</h3>
            <ol className="relative space-y-3 pl-1">
              {events.map((e, i) => (
                <li key={e.id} className="relative flex items-start gap-3">
                  {i < events.length - 1 && (
                    <span aria-hidden className="absolute left-[10px] top-6 bottom-[-12px] w-px bg-border/60" />
                  )}
                  <span className="relative z-10 inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/15 text-primary shrink-0">
                    {eventIcon(e.type)}
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-sm leading-tight">{eventLabel(e)}</p>
                    {e.date && (
                      <p className="text-xs text-muted-foreground tabular-nums mt-0.5">{formatLongDate(e.date)}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Quick add relatives */}
        {canManage && (
          <div className="px-5 py-4 border-b border-border/60">
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Add relative</p>
            <div className="grid grid-cols-2 gap-1.5">
              <Button variant="outline" size="sm" className="gap-1.5 justify-start" onClick={() => onAddRelative(person.id, "parent")}>+ Parent</Button>
              <Button variant="outline" size="sm" className="gap-1.5 justify-start" onClick={() => onAddRelative(person.id, "sibling")}>+ Sibling</Button>
              <Button variant="outline" size="sm" className="gap-1.5 justify-start" onClick={() => onAddRelative(person.id, "spouse")}>+ Partner</Button>
              <Button variant="outline" size="sm" className="gap-1.5 justify-start" onClick={() => onAddRelative(person.id, "child")}>+ Child</Button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-4 flex items-center justify-between gap-2">
          {!isGhost ? (
            <Link
              href={`/profile/${person.id}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              See profile
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          ) : <span />}
          {canRemoveMember && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive" disabled={removing}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove from tree?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {isGhost
                      ? <>{displayName} will be deleted permanently from the tree and from the system along with their relations to others in the tree. This cannot be undone.</>
                      : <>{displayName} will be removed from your tree. The profile stays untouched and remains in the system. People who are only connected to your tree through this profile will also disappear from this view.</>}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
