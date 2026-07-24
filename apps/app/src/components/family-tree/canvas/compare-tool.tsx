'use client'

import { useTranslations } from "next-intl"
import { GitCompareArrows, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TreePerson } from "@/queries/family-tree"

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

  const name = (id: string | null) => {
    if (!id) return null
    const p = persons[id]
    return p ? `${p.firstName} ${p.lastName}` : null
  }
  const [pick1, pick2] = picks
  const pick1Name = name(pick1)
  const pick2Name = name(pick2)

  if (!active) {
    return (
      <button
        type="button"
        onClick={onActivate}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-2 rounded-full bg-background/80 backdrop-blur-md border border-border/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-border transition-colors"
        title={t("compare.button")}
      >
        <GitCompareArrows className="h-3.5 w-3.5" />
        {t("compare.button")}
      </button>
    )
  }

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-[min(360px,92vw)] rounded-xl border border-border/60 bg-background/90 backdrop-blur-xl shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
        <span className="text-xs font-semibold text-muted-foreground">{t("compare.title")}</span>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label={tc("close")}>
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-3 space-y-2 text-sm">
        {([1, 2] as const).map((idx) => {
          const pickName = idx === 1 ? pick1Name : pick2Name
          return (
            <div key={idx} className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                {idx}
              </span>
              <span className={cn("truncate", !pickName && "text-muted-foreground italic")}>
                {pickName ?? t("compare.pickPlaceholder")}
              </span>
            </div>
          )
        })}

        {pick1 && pick2 && (
          connected && label
            ? <p className="pt-1 font-medium">{t("compare.resultLine", { targetName: pick2Name ?? "", rootName: pick1Name ?? "", label })}</p>
            : <p className="pt-1 text-muted-foreground">{t("compare.noPath")}</p>
        )}

        {(pick1 || pick2) && (
          <button type="button" onClick={onClear} className="text-xs text-muted-foreground hover:text-foreground underline">
            {t("compare.clear")}
          </button>
        )}
      </div>
    </div>
  )
}
