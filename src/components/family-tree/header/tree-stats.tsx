import type { TreePerson } from "@/queries/family-tree"
import { cn } from "@/lib/utils"

interface Props {
  persons:     Record<string, TreePerson>
  generations: Map<string, number>
  memberLimit: number
}

export function TreeStats({ persons, generations, memberLimit }: Props) {
  const count = Object.keys(persons).length
  const ratio = count / memberLimit
  const tone =
    ratio >= 1 ? "text-red-600 dark:text-red-400 font-semibold"
    : ratio >= 0.9 ? "text-amber-600 dark:text-amber-400 font-medium"
    : ""

  const gens = generations.size > 0
    ? Math.max(...generations.values()) - Math.min(...generations.values()) + 1
    : 1

  let oldestYear: number | null = null
  for (const p of Object.values(persons)) {
    if (p.birthDate) {
      const y = new Date(p.birthDate).getFullYear()
      if (oldestYear == null || y < oldestYear) oldestYear = y
    }
  }

  return (
    <p className="text-xs text-muted-foreground tabular-nums">
      <span className={cn(tone)}>{count}</span>
      <span className="text-muted-foreground/70"> / {memberLimit} people</span>
      <span className="mx-1.5 text-muted-foreground/50">·</span>
      <span>{gens} {gens === 1 ? "generation" : "generations"}</span>
      {oldestYear != null && (
        <>
          <span className="mx-1.5 text-muted-foreground/50">·</span>
          <span>oldest: {oldestYear}</span>
        </>
      )}
    </p>
  )
}
