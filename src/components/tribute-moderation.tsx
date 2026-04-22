'use client'

import { useTransition } from "react"
import { Check, X, Flower2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { approveTribute, rejectTribute } from "@/actions/tribute"

const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase() ?? "").join("")

interface TributeEntry {
  id: string
  text: string
  imageUrl?: string | null
  createdAt: Date
  author: { id: string; firstName: string; lastName: string; avatarUrl?: string | null }
}

interface Props {
  items: TributeEntry[]
  profileId: string
}

function TributeCard({ tribute, profileId }: { tribute: TributeEntry; profileId: string }) {
  const [isPending, startTransition] = useTransition()
  const authorName = `${tribute.author.firstName} ${tribute.author.lastName}`

  const approve = () =>
    startTransition(async () => {
      const result = await approveTribute(tribute.id, profileId)
      if (result?.error) toast.error(result.error)
      else toast.success("Tribute approved.")
    })

  const reject = () =>
    startTransition(async () => {
      const result = await rejectTribute(tribute.id, profileId)
      if (result?.error) toast.error(result.error)
      else toast.success("Tribute rejected.")
    })

  return (
    <article className="glass-card no-sheen overflow-hidden animate-fade-in">
      {tribute.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={tribute.imageUrl} alt="" loading="lazy" className="w-full h-auto block" />
      )}
      <div className="p-5 space-y-4">
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{tribute.text}</p>
        <div className="flex items-center gap-3 pt-1 border-t border-border/60">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-secondary">{initials(authorName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <span className="text-sm font-medium truncate block">{authorName}</span>
            <span className="text-xs text-muted-foreground">
              {tribute.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
            </span>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={reject} disabled={isPending} className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10">
              <X className="h-4 w-4" /> Reject
            </Button>
            <Button size="sm" onClick={approve} disabled={isPending} className="gap-1.5">
              <Check className="h-4 w-4" /> Approve
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}

export function TributeModeration({ items, profileId }: Props) {
  if (items.length === 0) {
    return (
      <div className="glass-card no-sheen flex flex-col items-center justify-center gap-3 py-20 text-center animate-fade-in">
        <Flower2 className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">No pending tributes.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {items.map((t) => (
        <TributeCard key={t.id} tribute={t} profileId={profileId} />
      ))}
    </div>
  )
}
