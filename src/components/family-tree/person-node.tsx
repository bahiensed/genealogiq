'use client'

import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { User } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TreePerson } from "@/queries/family-tree"

export interface PersonNodeData {
  person: TreePerson
  isRoot?: boolean
  isSessionUser?: boolean
  [key: string]: unknown
}

const formatYear = (date: Date | null) => date?.getFullYear().toString() ?? ""

function PersonNodeComponent({ data, selected }: NodeProps) {
  const { person, isRoot, isSessionUser } = data as PersonNodeData
  const fullName = `${person.firstName} ${person.lastName}`
  const isMemorialized = !!person.deathDate
  const birthYear = formatYear(person.birthDate)
  const deathYear = formatYear(person.deathDate)
  const yearLabel = isMemorialized
    ? `${birthYear || "—"} – ${deathYear}`
    : birthYear || ""

  const sideColor =
    person.gender === "female"
      ? "bg-rose-400/70"
      : person.gender === "male"
        ? "bg-[hsl(var(--brand-indigo)/0.8)]"
        : "bg-muted-foreground/40"

  const initials = `${person.firstName[0] ?? ""}${person.lastName[0] ?? ""}`.toUpperCase()

  return (
    <>
      <Handle type="target" position={Position.Top}   className="!opacity-0 !pointer-events-none" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0 !pointer-events-none" />
      <Handle type="target" position={Position.Left}  id="left"  className="!opacity-0 !pointer-events-none" />
      <Handle type="source" position={Position.Right} id="right" className="!opacity-0 !pointer-events-none" />

      <div
        className={cn(
          "relative flex items-center gap-2.5 px-3 py-2.5 w-[160px] cursor-pointer",
          "rounded-xl border border-white/30 bg-card/60 backdrop-blur-xl",
          "transition-[box-shadow,border-color] duration-200",
          "hover:border-white/50 hover:bg-card/75",
          selected && "ring-2 ring-primary/60 border-primary/30",
          isRoot && "scale-105",
        )}
        style={{
          boxShadow: "0 8px 24px -8px hsl(230 40% 12% / 0.35), inset 0 1px 0 hsl(0 0% 100% / 0.5)",
        }}
      >
        {/* Gender sidebar */}
        <span aria-hidden className={cn("absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-full", sideColor)} />

        {/* Avatar */}
        <div className="h-9 w-9 rounded-full overflow-hidden ring-1 ring-background/60 shrink-0 bg-muted flex items-center justify-center">
          {person.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={person.avatarUrl} alt={fullName} className={cn("h-full w-full object-cover", isMemorialized && "saturate-50")} />
          ) : (
            <span className="text-[11px] font-semibold text-muted-foreground">
              {initials || <User className="h-4 w-4" />}
            </span>
          )}
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold leading-tight truncate">{fullName}</p>
          {yearLabel && (
            <p className={cn("text-[10px] text-muted-foreground mt-0.5 tabular-nums", isMemorialized && "italic")}>
              {yearLabel}
            </p>
          )}
          {isSessionUser && (
            <span className="mt-0.5 inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-px rounded-full bg-primary text-primary-foreground">
              You
            </span>
          )}
        </div>
      </div>
    </>
  )
}

export const PersonNode = memo(PersonNodeComponent)
