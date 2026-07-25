'use client'

import { useTranslations } from "next-intl"
import { GitCompare, CircleX, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TreePerson } from "@/queries/family-tree"

// Pick 1 = blue, pick 2 = green — matches the ring color on the corresponding
// node card (person-node.tsx). Intermediate path nodes stay amber there.
const PICK_BADGE_COLOR: Record<1 | 2, string> = {
  1: "bg-blue-500",
  2: "bg-green-500",
}

interface Props {
  active:     boolean
  onActivate: () => void
  onClose:    () => void
  persons:    Record<string, TreePerson>
  /** The two currently-picked person ids, in pick order — either may be null. */
  picks:      [string | null, string | null]
  onClear:    () => void
  /** True once both picks resolve to SOME connecting path (any length) —
   *  distinct from `label`, which may still be the generic "relative"
   *  fallback for a real but distant connection. Drives which of the
   *  result / no-path messages renders. */
  connected:  boolean
  /** Human label for pick[1] relative to pick[0] (e.g. "cousin"), already
   *  translated — only meaningful once both picks are set. */
  label:      string | null
}

export function CompareTool({ active, onActivate, onClose, persons, picks, onClear, connected, label }: Props) {
  const t = useTranslations("FamilyTree")
  const tc = useTranslations("Common")

  const fullName = (id: string | null) => {
    if (!id) return null
    const p = persons[id]
    return p ? `${p.firstName} ${p.lastName}` : null
  }
  // First name only — used in the "X is Y's Z" sentence below, which reads
  // more naturally that way. The picked-person rows next to the numbered
  // circles keep the full name (fullName above) since two people who share
  // a first name would otherwise be indistinguishable there.
  const firstName = (id: string | null) => {
    if (!id) return null
    const p = persons[id]
    return p ? p.firstName : null
  }
  const [pick1, pick2] = picks
  const pick1Name = fullName(pick1)
  const pick2Name = fullName(pick2)
  const pick1FirstName = firstName(pick1)
  const pick2FirstName = firstName(pick2)

  if (!active) {
    return (
      <button
        type="button"
        onClick={onActivate}
        className="inline-flex items-center gap-2 rounded-full bg-background/80 backdrop-blur-md border border-border/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-border transition-colors"
        title={t("compare.button")}
      >
        <GitCompare className="h-3.5 w-3.5" />
        {t("compare.button")}
      </button>
    )
  }

  return (
    <div className="w-[min(360px,92vw)] rounded-xl border border-border/60 bg-background/90 backdrop-blur-xl shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
        <span className="text-sm font-semibold text-muted-foreground">{t("compare.title")}</span>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label={tc("close")}>
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-3 space-y-2 text-sm">
        {([1, 2] as const).map((idx) => {
          const pickName = idx === 1 ? pick1Name : pick2Name
          return (
            <div key={idx} className="flex items-center gap-2">
              <span className={cn("h-4 w-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center shrink-0", PICK_BADGE_COLOR[idx])}>
                {idx}
              </span>
              <span className={cn("truncate", !pickName && "text-muted-foreground")}>
                {pickName ?? t("compare.pickPlaceholder")}
              </span>
            </div>
          )
        })}

        {pick1 && pick2 && (
          connected && label
            ? <p className="pt-1 font-normal">{t("compare.resultLine", { targetName: pick2FirstName ?? "", rootName: pick1FirstName ?? "", label })}</p>
            : <p className="pt-1 text-muted-foreground">{t("compare.noPath")}</p>
        )}

        {pick1 && pick2 && (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-2 text-muted-foreground hover:text-red-600 dark:hover:text-red-500 transition-colors"
          >
            <CircleX className="h-4 w-4 shrink-0 text-red-600 dark:text-red-500" />
            {t("compare.clear")}
          </button>
        )}
      </div>
    </div>
  )
}
