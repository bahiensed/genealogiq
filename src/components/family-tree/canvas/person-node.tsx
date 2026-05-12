'use client'

import { User, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TreePerson } from "@/queries/family-tree"
import { NODE_W, NODE_H } from "./layout"

interface Props {
  person:         TreePerson
  x:              number
  y:              number
  isRoot:         boolean
  isSessionUser:  boolean
  isSelected:     boolean
  onActivate:     () => void
}

function formatYear(d: Date | null): string {
  return d ? new Date(d).getFullYear().toString() : ""
}

export function PersonNode({ person, x, y, isRoot, isSessionUser, isSelected, onActivate }: Props) {
  const isGhost = person.role === "APP_GHOST"
  const isMemorial = person.role === "APP_MEMO"

  const ringColor =
    person.gender === "FEMALE"
      ? "ring-rose-300/70"
      : person.gender === "MALE"
        ? "ring-[hsl(var(--brand-indigo)/0.55)]"
        : "ring-border/50"

  const initials = `${person.firstName[0] ?? ""}${person.lastName[0] ?? ""}`.toUpperCase()
  const birthYear = formatYear(person.birthDate)
  const deathYear = formatYear(person.deathDate)
  const yearLabel = deathYear ? `${birthYear || "—"} – ${deathYear}` : birthYear

  const displayName = person.maidenName
    ? `${person.firstName} ${person.lastName} (née ${person.maidenName})`
    : `${person.firstName} ${person.lastName}`

  return (
    <foreignObject x={x} y={y} width={NODE_W} height={NODE_H} style={{ overflow: "visible" }}>
      <div
        data-node={person.id}
        onClick={(e) => { e.stopPropagation(); onActivate() }}
        className={cn(
          "h-full w-full cursor-pointer rounded-xl border bg-card/85 backdrop-blur-md flex items-center gap-2.5 px-2.5",
          "transition-[transform,box-shadow,border-color] duration-150",
          isGhost ? "border-dashed border-border/70" : "border-white/30",
          isSelected && "ring-2 ring-primary/70 border-primary/30",
          isRoot && "scale-[1.04]",
        )}
        style={{
          boxShadow: isGhost
            ? undefined
            : "0 4px 14px -6px hsl(230 40% 12% / 0.25), inset 0 1px 0 hsl(0 0% 100% / 0.4)",
        }}
      >
        <div className={cn("h-9 w-9 rounded-full overflow-hidden shrink-0 bg-muted flex items-center justify-center ring-2", ringColor)}>
          {person.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={person.avatarUrl}
              alt={displayName}
              className={cn("h-full w-full object-cover", isMemorial && "saturate-50")}
            />
          ) : (
            <span className="text-[10px] font-semibold text-muted-foreground">
              {initials || <User className="h-3.5 w-3.5" />}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className={cn("text-[11.5px] font-semibold leading-tight truncate", isGhost && "italic text-muted-foreground")}>
            {displayName}
          </p>
          {person.nickname && (
            <p className="text-[10px] italic text-muted-foreground/80 leading-tight truncate">
              &ldquo;{person.nickname}&rdquo;
            </p>
          )}
          {yearLabel && (
            <p className="text-[10px] text-muted-foreground/80 mt-0.5 tabular-nums leading-tight">
              {yearLabel}
            </p>
          )}
        </div>

        {(isSessionUser || isMemorial) && (
          <div className="absolute bottom-1 right-1 flex items-center gap-1">
            {isMemorial && (
              <span className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full bg-secondary text-foreground/70" title="Memorial">
                <BookOpen className="h-2 w-2" />
              </span>
            )}
            {isSessionUser && (
              <span className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded-full bg-primary text-primary-foreground">
                You
              </span>
            )}
          </div>
        )}
      </div>
    </foreignObject>
  )
}
