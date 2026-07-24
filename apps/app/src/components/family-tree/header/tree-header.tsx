'use client'

import { useState } from "react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { Plus, Sprout } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BackButton } from "@/components/back-button"
import { AddRelativeDialog } from "../dialogs/add-relative-dialog"
import { TreeSubtitle } from "./tree-subtitle"
import type { TreePerson } from "@/queries/family-tree"

interface Props {
  rootFirstName: string
  rootId:        string
  persons:       Record<string, TreePerson>
  generations:   Map<string, number>
  memberLimit:   number
  currentTier:   string
  canManage:     boolean
  atLimit:       boolean
  rootParents:   Array<{ id: string; name: string }>
}

export function TreeHeader({ rootFirstName, rootId, persons, generations, memberLimit, currentTier, canManage, atLimit, rootParents }: Props) {
  const t = useTranslations("FamilyTree")
  const [open, setOpen] = useState(false)
  return (
    <div className="relative z-10 flex items-center justify-between gap-3 px-4 md:px-6 py-3 md:py-4 border-b border-border/60 bg-background/60 backdrop-blur-md shrink-0">
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        <BackButton href={`/profile/${rootId}`} label={t("header.backToProfile")} />
        <div className="min-w-0">
          <h1 className="text-xl md:text-3xl font-semibold tracking-tight truncate">
            {t("header.title", { name: rootFirstName })}
          </h1>
          <TreeSubtitle persons={persons} generations={generations} memberLimit={memberLimit} currentTier={currentTier} />
        </div>
      </div>

      {canManage && (
        atLimit ? (
          <Button size="sm" asChild className="gap-1.5 shrink-0">
            <Link href="/subscriptions">
              <Sprout className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{t("header.upgradePlan")}</span>
            </Link>
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={() => setOpen(true)}
              aria-label={t("header.addRelative")}
              title={t("header.addRelative")}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{t("header.addRelative")}</span>
            </Button>
            {open && (
              <AddRelativeDialog
                open={true}
                onClose={() => setOpen(false)}
                anchorId={rootId}
                rootId={rootId}
                initialKind="parent"
                anchorParents={rootParents}
                onSuccess={() => { setOpen(false); window.location.reload() }}
              />
            )}
          </>
        )
      )}
    </div>
  )
}
