import { useTranslations } from "next-intl"
import { UpgradeHint } from "@/components/upgrade-hint"
import { cn } from "@/lib/utils"
import type { TreePerson } from "@/queries/family-tree"

interface Props {
  persons:     Record<string, TreePerson>
  generations: Map<string, number>
  memberLimit: number
  currentTier: string
}

export function TreeStats({ persons, generations, memberLimit, currentTier }: Props) {
  const t = useTranslations("FamilyTree")
  const count = Object.keys(persons).length
  const ratio = count / memberLimit
  const atLimit = ratio >= 1
  const tone = !atLimit && ratio >= 0.9 ? "text-amber-600 dark:text-amber-400" : ""

  const gens = generations.size > 0
    ? Math.max(...generations.values()) - Math.min(...generations.values()) + 1
    : 1

  return (
    <p className="text-xs text-muted-foreground tabular-nums">
      <span>{t("stats.generations", { count: gens })}</span>
      <span className="mx-1.5 text-muted-foreground/50">·</span>
      <span className={cn(tone)}>{count}</span>
      <span className="text-muted-foreground/70">{t("stats.peopleOfLimit", { limit: memberLimit })}</span>
      {atLimit && currentTier !== "CENTURY" && (
        <>
          <span className="mx-1.5 text-muted-foreground/50">·</span>
          <UpgradeHint context="tree" currentTier={currentTier} inline />
        </>
      )}
    </p>
  )
}
