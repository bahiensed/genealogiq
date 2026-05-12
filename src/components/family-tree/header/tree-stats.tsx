import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TreePerson } from "@/queries/family-tree"

interface Props {
  persons:     Record<string, TreePerson>
  generations: Map<string, number>
  memberLimit: number
  currentTier: string
}

export function TreeStats({ persons, generations, memberLimit, currentTier }: Props) {
  const count = Object.keys(persons).length
  const ratio = count / memberLimit
  const tone =
    ratio >= 1     ? "text-red-600 dark:text-red-400 font-semibold"
    : ratio >= 0.9 ? "text-amber-600 dark:text-amber-400 font-medium"
    :                ""

  const gens = generations.size > 0
    ? Math.max(...generations.values()) - Math.min(...generations.values()) + 1
    : 1

  const showUpgrade = currentTier !== "CENTURY"

  return (
    <p className="text-xs text-muted-foreground tabular-nums">
      <span>{gens} {gens === 1 ? "generation" : "generations"}</span>
      <span className="mx-1.5 text-muted-foreground/50">·</span>
      <span className={cn(tone)}>{count}</span>
      <span className="text-muted-foreground/70">/{memberLimit} people</span>
      {showUpgrade && (
        <>
          <span className="mx-1.5 text-muted-foreground/50">·</span>
          <Link href="/plans" className="text-primary hover:underline inline-flex items-center gap-0.5">
            Need a bigger tree? Upgrade your plan
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </>
      )}
    </p>
  )
}
