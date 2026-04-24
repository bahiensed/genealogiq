'use client'

import { useState, useTransition } from "react"
import Link from "next/link"
import { ExternalLink, Trash2, UserPlus, User } from "lucide-react"
import { toast } from "sonner"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
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
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { removeRelation } from "@/actions/family-tree"
import { AddRelativeDialog } from "@/components/family-tree/add-relative-dialog"
import type { TreePerson } from "@/queries/family-tree"
import type { RelatedRelation } from "@/components/family-tree/family-tree-client"

interface Props {
  open: boolean
  onClose: () => void
  person: TreePerson | null
  relatedRelations: RelatedRelation[]
  rootId: string
  canManage: boolean
  onSuccess?: () => void
}

const formatDate = (d: Date | null) =>
  d ? d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : null

function getRelationLabel(relations: RelatedRelation[], personId: string): string | null {
  const labels: string[] = []
  for (const r of relations) {
    if (r.type === "PARENT_OF") {
      if (r.fromId === personId) labels.push("Parent")
      else if (r.toId === personId) labels.push("Child")
    } else if (r.type === "SPOUSE") {
      labels.push("Spouse")
    } else if (r.type === "SIBLING") {
      labels.push("Sibling")
    }
  }
  if (labels.length === 0) return null
  return [...new Set(labels)].join(" · ")
}

export function PersonInfoSheet({ open, onClose, person, relatedRelations, rootId, canManage, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition()
  const [addOpen, setAddOpen] = useState(false)

  if (!person) return null

  const fullName = `${person.firstName} ${person.lastName}`
  const isRoot = person.id === rootId
  const isMemorialized = !!person.deathDate
  const initials = `${person.firstName[0] ?? ""}${person.lastName[0] ?? ""}`.toUpperCase()
  const canRemove = canManage && !isRoot && relatedRelations.length > 0
  const relationLabel = isRoot ? null : getRelationLabel(relatedRelations, person.id)

  const handleRemove = () => {
    startTransition(async () => {
      const types = [...new Set(relatedRelations.map((r) => r.type))]
      for (const type of types) {
        await removeRelation(rootId, person.id, type)
      }
      toast.success("Removed from tree.")
      onClose()
      onSuccess?.()
    })
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
        <SheetContent side="right" className="w-80 sm:w-96 flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/60">
            <SheetTitle className="sr-only">Person details</SheetTitle>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full overflow-hidden ring-2 ring-border/60 bg-muted flex items-center justify-center shrink-0">
                {person.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={person.avatarUrl} alt={fullName} className={cn("h-full w-full object-cover", isMemorialized && "saturate-50")} />
                ) : (
                  <span className="text-xl font-semibold text-muted-foreground">
                    {initials || <User className="h-6 w-6" />}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-base leading-tight">{fullName}</p>
                {isRoot && <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">You</span>}
                {isMemorialized && <span className="text-xs text-muted-foreground italic block">Memorialized</span>}
                {relationLabel && (
                  <span className="mt-1 inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {relationLabel}
                  </span>
                )}
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {person.birthDate && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Born</p>
                <p className="text-sm mt-0.5">{formatDate(person.birthDate)}</p>
              </div>
            )}
            {person.deathDate && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Died</p>
                <p className="text-sm mt-0.5">{formatDate(person.deathDate)}</p>
              </div>
            )}
          </div>

          <div className="px-6 pb-6 pt-4 border-t border-border/60 space-y-2">
            <Button asChild variant="outline" className="w-full gap-2">
              <Link href={`/profile/${person.id}`} onClick={onClose}>
                <ExternalLink className="h-4 w-4" />
                View profile
              </Link>
            </Button>

            {canManage && (
              <Button variant="outline" className="w-full gap-2" onClick={() => setAddOpen(true)}>
                <UserPlus className="h-4 w-4" />
                Add relative
              </Button>
            )}

            {canRemove && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full gap-2" disabled={isPending}>
                    <Trash2 className="h-4 w-4" />
                    Remove from tree
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove {fullName}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove the connection between {fullName} and this family tree. Their profile will not be deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRemove}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AddRelativeDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        anchorId={person.id}
        rootId={rootId}
        onSuccess={onSuccess}
      />
    </>
  )
}
