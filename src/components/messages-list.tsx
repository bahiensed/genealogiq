"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Check, X, User, Flower2, UserPlus, ArrowUpRight } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { approveTribute, rejectTribute } from "@/actions/tribute"
import { acceptFamilyRequest, rejectFamilyRequest } from "@/actions/family-tree"
import type { MessagesData } from "@/queries/notifications"

const dateFmt = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase() ?? "").join("")
}

function relationLabel(type: string, subtype: string | null, requesterIsParent: boolean): string {
  if (type === "SPOUSE")  return subtype === "partner" ? "partner" : "spouse"
  if (type === "SIBLING") return subtype === "half" ? "half-sibling" : "sibling"
  return requesterIsParent ? "parent" : "child"
}

interface Props {
  data:          MessagesData
  sessionUserId: string
}

export function MessagesList({ data, sessionUserId }: Props) {
  const { pendingTributes, pendingFamilyRequests, recentActivity } = data
  const hasPending  = pendingTributes.length > 0 || pendingFamilyRequests.length > 0
  const hasActivity = recentActivity.length > 0

  if (!hasPending && !hasActivity) {
    return (
      <div className="glass-card no-sheen flex flex-col items-center justify-center gap-3 py-20 text-center animate-fade-in">
        <Flower2 className="h-10 w-10 text-muted-foreground/50" />
        <p className="text-muted-foreground">Your inbox is empty.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {hasPending && (
        <section className="space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending action</h2>
          {pendingTributes.map((t) => (
            <TributeCard key={`t-${t.id}`} tribute={t} />
          ))}
          {pendingFamilyRequests.map((r) => (
            <FamilyRequestCard key={`f-${r.id}`} request={r} sessionUserId={sessionUserId} />
          ))}
        </section>
      )}

      {hasActivity && (
        <section className="space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent activity</h2>
          {recentActivity.map((a) => <ActivityRow key={a.id} item={a} />)}
        </section>
      )}
    </div>
  )
}

function TributeCard({ tribute }: { tribute: MessagesData["pendingTributes"][number] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const authorName = `${tribute.author.firstName} ${tribute.author.lastName}`

  const handle = (action: "approve" | "reject") => {
    startTransition(async () => {
      const result = action === "approve"
        ? await approveTribute(tribute.id, tribute.profileId)
        : await rejectTribute(tribute.id, tribute.profileId)
      if (result?.error) { toast.error(result.error); return }
      toast.success(action === "approve" ? "Tribute approved." : "Tribute rejected.")
      router.refresh()
    })
  }

  return (
    <article className="glass-card no-sheen overflow-hidden animate-fade-in">
      {tribute.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={tribute.imageUrl} alt="" loading="lazy" className="w-full h-auto block max-h-72 object-cover" />
      )}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-secondary">{initials(authorName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              <span className="font-semibold">{authorName}</span>
              <span className="text-muted-foreground"> wrote a tribute for </span>
              <span className="font-medium">{tribute.profileName}</span>
            </p>
            <p className="text-xs text-muted-foreground">{dateFmt.format(tribute.createdAt)}</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">{tribute.text}</p>
        <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handle("reject")}
            disabled={isPending}
            className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10"
          >
            <X className="h-3.5 w-3.5" />
            Reject
          </Button>
          <Button size="sm" onClick={() => handle("approve")} disabled={isPending} className="gap-1.5">
            <Check className="h-3.5 w-3.5" />
            Approve
          </Button>
        </div>
      </div>
    </article>
  )
}

function FamilyRequestCard({ request, sessionUserId }: { request: MessagesData["pendingFamilyRequests"][number]; sessionUserId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const requester = request.fromId === sessionUserId ? request.to : request.from
  const requesterIsParent = request.type === "PARENT_OF" && request.fromId === requester.id
  const role = relationLabel(request.type, request.subtype, requesterIsParent)
  const requesterInitials = `${requester.firstName[0] ?? ""}${requester.lastName[0] ?? ""}`.toUpperCase()

  const handle = (action: "accept" | "reject") => {
    startTransition(async () => {
      const result = action === "accept"
        ? await acceptFamilyRequest(request.id)
        : await rejectFamilyRequest(request.id)
      if (result?.error) { toast.error(result.error); return }
      toast.success(action === "accept" ? "Invitation accepted." : "Invitation declined.")
      router.refresh()
    })
  }

  return (
    <article className="glass-card no-sheen p-4 flex items-center gap-4 animate-fade-in">
      <div className={cn("h-12 w-12 rounded-full overflow-hidden shrink-0 bg-muted flex items-center justify-center ring-2 ring-border/50")}>
        {requester.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={requester.avatarUrl} alt={`${requester.firstName} ${requester.lastName}`} className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm font-semibold text-muted-foreground">{requesterInitials || <User className="h-4 w-4" />}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-semibold">{requester.firstName} {requester.lastName}</span>
          <span className="text-muted-foreground"> wants to add you as their </span>
          <span className="font-medium">{role}</span>
          <span className="text-muted-foreground">.</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{dateFmt.format(request.createdAt)}</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button onClick={() => handle("reject")} disabled={isPending} variant="outline" size="sm" className="gap-1.5">
          <X className="h-3.5 w-3.5" />
          Decline
        </Button>
        <Button onClick={() => handle("accept")} disabled={isPending} size="sm" className="gap-1.5">
          <Check className="h-3.5 w-3.5" />
          Accept
        </Button>
      </div>
    </article>
  )
}

function ActivityRow({ item }: { item: MessagesData["recentActivity"][number] }) {
  const actorName = item.actor ? `${item.actor.firstName} ${item.actor.lastName}` : "Someone"
  const actorInitials = item.actor
    ? `${item.actor.firstName[0] ?? ""}${item.actor.lastName[0] ?? ""}`.toUpperCase()
    : "?"

  let icon: React.ReactNode
  let body: React.ReactNode
  let href: string | null = null

  if (item.type === "TRIBUTE_APPROVED" || item.type === "TRIBUTE_REJECTED") {
    const approved = item.type === "TRIBUTE_APPROVED"
    icon = approved ? <Check className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-destructive" />
    body = (
      <>
        <span className="text-muted-foreground">Your tribute was </span>
        <span className="font-medium">{approved ? "approved" : "declined"}</span>
      </>
    )
    href = item.profileId ? `/profile/${item.profileId}/tributes` : null
  } else if (item.type === "FAMILY_REQUEST_ACCEPTED" || item.type === "FAMILY_REQUEST_REJECTED") {
    const accepted = item.type === "FAMILY_REQUEST_ACCEPTED"
    icon = accepted ? <UserPlus className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-destructive" />
    body = (
      <>
        <span className="font-medium">{actorName}</span>
        <span className="text-muted-foreground"> {accepted ? "joined your tree" : "declined your invite"}</span>
      </>
    )
  } else {
    return null
  }

  const content = (
    <article className="glass-card no-sheen p-3 flex items-center gap-3 animate-fade-in hover:bg-accent/40 transition-colors">
      <Avatar className="h-9 w-9">
        <AvatarFallback className="text-xs bg-secondary">{actorInitials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate flex items-center gap-1.5">{icon}<span>{body}</span></p>
        <p className="text-xs text-muted-foreground mt-0.5">{dateFmt.format(item.createdAt)}</p>
      </div>
      {href && <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0" />}
    </article>
  )

  return href ? <Link href={href}>{content}</Link> : content
}
