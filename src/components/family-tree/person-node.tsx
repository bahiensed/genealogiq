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
  const isMemorialized = person.role === "APP_MEMO" || !!person.deathDate
  const isGhost = person.role === "APP_GHOST"
  const birthYear = formatYear(person.birthDate)
  const deathYear = formatYear(person.deathDate)
  const yearLabel = deathYear
    ? `${birthYear || "—"} – ${deathYear}`
    : birthYear || ""

  const ringColor =
    person.gender === "FEMALE"
      ? "ring-rose-300/70"
      : person.gender === "MALE"
        ? "ring-[hsl(var(--brand-indigo)/0.55)]"
        : "ring-border/50"

  const initials = `${person.firstName[0] ?? ""}${person.lastName[0] ?? ""}`.toUpperCase()

  return (
    <>
      <Handle type="target" position={Position.Top}    className="!opacity-0 !pointer-events-none" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0 !pointer-events-none" />
      <Handle type="target" position={Position.Left}   id="left"  className="!opacity-0 !pointer-events-none" />
      <Handle type="source" position={Position.Right}  id="right" className="!opacity-0 !pointer-events-none" />

      <div
        className={cn(
          "relative flex items-center gap-2 px-2.5 py-2 w-[160px] cursor-pointer",
          "rounded-xl border bg-card/70 backdrop-blur-md",
          isGhost ? "border-dashed border-border/70" : "border-white/30",
          "transition-[box-shadow,border-color,transform] duration-200",
          "hover:bg-card/85",
          selected && "ring-2 ring-primary/60 border-primary/30",
          isRoot && "scale-[1.04]",
        )}
        style={{
          boxShadow: isGhost
            ? undefined
            : "0 4px 14px -6px hsl(230 40% 12% / 0.25), inset 0 1px 0 hsl(0 0% 100% / 0.4)",
        }}
      >
        {/* Avatar */}
        <div className={cn(
          "h-8 w-8 rounded-full overflow-hidden shrink-0 bg-muted flex items-center justify-center ring-2",
          ringColor,
          isGhost && "ring-dashed",
        )}>
          {person.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={person.avatarUrl}
              alt={fullName}
              className={cn("h-full w-full object-cover", isMemorialized && "saturate-50")}
            />
          ) : (
            <span className="text-[10px] font-semibold text-muted-foreground">
              {initials || <User className="h-3.5 w-3.5" />}
            </span>
          )}
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className={cn(
            "text-[11.5px] font-semibold leading-tight truncate",
            isGhost && "italic text-muted-foreground",
          )}>
            {fullName}
          </p>
          {yearLabel && (
            <p className={cn(
              "text-[10px] text-muted-foreground/80 mt-0.5 tabular-nums",
              isMemorialized && "italic",
            )}>
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
