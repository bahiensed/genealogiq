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
    // Outer bar stays full-bleed (border/background span the viewport). The
    // inner structure is bio/page.tsx's icon+title/subtitle block verbatim:
    // `<div className="mb-8">` > [title row] + [subtitle `<p>`] as SIBLINGS —
    // the subtitle is NOT nested inside the icon+title group, so it spans
    // full width starting at the icon's own left edge, same as Bio/Gallery,
    // not indented to start under the title text.
    //
    // Top padding is NOT bio's own pt-24: the site header is `fixed`, out of
    // flow, so bio's <main> (which sits in normal flow, unaware of it) needs
    // pt-24 to both clear the header's own height (h-16 = 64px) AND add
    // breathing room (32px) below it. This page's own container is already
    // `fixed top-16`, i.e. already starts right at the header's bottom edge
    // — so it only needs that remaining 32px (pt-8), not the full pt-24, or
    // the header's height gets cleared twice.
    <div className="relative z-10 border-b border-border/60 bg-background/60 backdrop-blur-md shrink-0">
      <div className="container pt-8 pb-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <BackButton href={`/profile/${rootId}`} label={t("header.backToProfile")} />
            <h1 className="text-4xl font-semibold tracking-tight whitespace-nowrap">
              {t("header.title", { name: rootFirstName })}
            </h1>
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
        <TreeSubtitle persons={persons} generations={generations} memberLimit={memberLimit} currentTier={currentTier} />
      </div>
    </div>
  )
}
