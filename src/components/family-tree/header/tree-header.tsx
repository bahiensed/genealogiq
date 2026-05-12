'use client'

import { useState } from "react"
import { TreePine, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddRelativeDialog } from "../dialogs/add-relative-dialog"
import { TreeStats } from "./tree-stats"
import type { TreePerson } from "@/queries/family-tree"

interface Props {
  rootName:     string
  rootId:       string
  persons:      Record<string, TreePerson>
  generations:  Map<string, number>
  memberLimit:  number
  canManage:    boolean
  atLimit:      boolean
}

export function TreeHeader({ rootName, rootId, persons, generations, memberLimit, canManage, atLimit }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative z-10 flex items-center justify-between px-4 md:px-6 py-3 border-b border-border/60 bg-background/60 backdrop-blur-md shrink-0">
      <div className="flex items-center gap-2.5">
        <TreePine className="h-5 w-5 text-primary" />
        <div>
          <h1 className="font-semibold text-sm leading-tight">{rootName}&apos;s Family Tree</h1>
          <TreeStats persons={persons} generations={generations} memberLimit={memberLimit} />
        </div>
      </div>
      {canManage && !atLimit && (
        <>
          <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add relative
          </Button>
          {open && (
            <AddRelativeDialog
              open={true}
              onClose={() => setOpen(false)}
              anchorId={rootId}
              rootId={rootId}
              initialKind="parent"
              onSuccess={() => { setOpen(false); window.location.reload() }}
            />
          )}
        </>
      )}
    </div>
  )
}
