'use client'

import { useState } from "react"
import Link from "next/link"
import { Pencil, Trash2, X, ExternalLink } from "lucide-react"
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
import type { TreePerson, TreeRelation } from "@/queries/family-tree"

interface Props {
  open:      boolean
  onClose:   () => void
  person:    TreePerson | null
  rootId:    string
  persons:   Record<string, TreePerson>
  relations: TreeRelation[]
  canManage: boolean
  onEdit:    () => void
  onSuccess: () => void
}

function formatDate(d: Date | null): string {
  if (!d) return ""
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

export function PersonInfoSheet({ open, onClose, person, rootId, persons, relations, canManage, onEdit, onSuccess }: Props) {
  const [removing, setRemoving] = useState(false)

  if (!person) return null

  const isSelf = person.id === rootId
  const isGhost = person.role === "APP_GHOST"
  const isMemorial = person.role === "APP_MEMO"

  const label = relationFromRoot(persons, relations, rootId, person.id)
  const displayName = person.maidenName
    ? `${person.firstName} ${person.lastName} (née ${person.maidenName})`
    : `${person.firstName} ${person.lastName}`
  const initials = `${person.firstName[0] ?? ""}${person.lastName[0] ?? ""}`.toUpperCase()

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
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/60 flex flex-row items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
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
              <SheetTitle className={cn("text-base leading-tight", isGhost && "italic")}>{displayName}</SheetTitle>
              {person.nickname && (
                <p className="text-xs italic text-muted-foreground mt-0.5">&ldquo;{person.nickname}&rdquo;</p>
              )}
              {label && (
                <p className="text-xs text-primary mt-1">{label}</p>
              )}
              {isSelf && (
                <p className="text-xs text-muted-foreground mt-1">This is you.</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>

        <div className="px-5 py-4 space-y-4">
          {(person.birthDate || person.deathDate) && (
            <div className="space-y-2 text-sm">
              {person.birthDate && (
                <div>
                  <span className="text-muted-foreground">Born </span>
                  <span className="font-medium">{formatDate(person.birthDate)}</span>
                  {person.birthPlace && <span className="text-muted-foreground"> in {person.birthPlace}{person.birthCountry ? `, ${person.birthCountry}` : ""}</span>}
                </div>
              )}
              {person.deathDate && (
                <div>
                  <span className="text-muted-foreground">Died </span>
                  <span className="font-medium">{formatDate(person.deathDate)}</span>
                  {person.deathPlace && <span className="text-muted-foreground"> in {person.deathPlace}{person.deathCountry ? `, ${person.deathCountry}` : ""}</span>}
                </div>
              )}
            </div>
          )}

          {person.shortBio && (
            <p className="text-sm leading-relaxed text-foreground/90">{person.shortBio}</p>
          )}

          {isMemorial && (
            <Button asChild variant="outline" size="sm" className="w-full gap-2">
              <Link href={`/profile/${person.id}`}>
                Open memorial
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>

        {canManage && !isSelf && (
          <div className="px-5 pb-5 pt-3 border-t border-border/60 flex gap-2 sticky bottom-0 bg-background/80 backdrop-blur-md">
            <Button variant="outline" size="sm" onClick={onEdit} className="gap-2 flex-1">
              <Pencil className="h-3.5 w-3.5" />Edit
            </Button>
            {isGhost && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-2" disabled={removing}>
                    <Trash2 className="h-3.5 w-3.5" />Remove
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove from tree?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {displayName} will be deleted permanently along with their relations to others in the tree. This cannot be undone.
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
        )}
      </SheetContent>
    </Sheet>
  )
}
