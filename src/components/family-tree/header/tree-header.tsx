'use client'

import { useState } from "react"
import Link from "next/link"
import { Network, Plus, Sparkles } from "lucide-react"
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
  currentTier:  string
  canManage:    boolean
  atLimit:      boolean
}

export function TreeHeader({ rootName, rootId, persons, generations, memberLimit, currentTier, canManage, atLimit }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative z-10 flex items-center justify-between px-4 md:px-6 py-3 border-b border-border/60 bg-background/60 backdrop-blur-md shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <Network className="h-5 w-5 text-primary shrink-0" />
        <div className="min-w-0">
          <h1 className="font-semibold text-sm leading-tight truncate">
            {rootName}&apos;s Family Tree
          </h1>
          <TreeStats persons={persons} generations={generations} memberLimit={memberLimit} currentTier={currentTier} />
        </div>
      </div>

      {canManage && (
        atLimit ? (
          <Button size="sm" asChild className="gap-1.5 shrink-0">
            <Link href="/plans">
              <Sparkles className="h-3.5 w-3.5" />
              Upgrade plan
            </Link>
          </Button>
        ) : (
          <>
            <Button size="sm" className="gap-1.5 shrink-0" onClick={() => setOpen(true)}>
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
        )
      )}
    </div>
  )
}
