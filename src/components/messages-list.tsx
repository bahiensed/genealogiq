"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Check, X, User, Flower2, ArrowUpRight } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { approveTribute, rejectTribute } from "@/actions/tribute"
import { acceptFamilyRequest, rejectFamilyRequest } from "@/actions/family-tree"
import type { MessagesData } from "@/queries/notifications"

const dateFmt = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })

function relationLabel(type: string, subtype: string | null, requesterIsParent: boolean): string {
  if (type === "SPOUSE")  return subtype === "partner" ? "partner" : "spouse"
  if (type === "SIBLING") return subtype === "half" ? "half-sibling" : "sibling"
  return requesterIsParent ? "parent" : "child"
}

interface Actor {
  id?:        string
  firstName:  string
  lastName:   string
  avatarUrl:  string | null
}

interface MessageCardProps {
  actor:       Actor
  description: React.ReactNode
  timestamp:   Date
  body?:       React.ReactNode
  imageUrl?:   string | null
  footer?:     React.ReactNode
}

function MessageCard({ actor, description, timestamp, body, imageUrl, footer }: MessageCardProps) {
  const name     = `${actor.firstName} ${actor.lastName}`.trim()
  const initials = `${actor.firstName[0] ?? ""}${actor.lastName[0] ?? ""}`.toUpperCase()

  return (
    <article className="glass-card no-sheen overflow-hidden animate-fade-in">
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" loading="lazy" className="w-full h-auto block max-h-72 object-cover" />
      )}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className={cn("h-10 w-10 rounded-full overflow-hidden shrink-0 bg-muted flex items-center justify-center ring-2 ring-border/50")}>
            {actor.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={actor.avatarUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-semibold text-muted-foreground">{initials || <User className="h-4 w-4" />}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              <span className="font-semibold">{name || "Someone"}</span>
              <span className="text-muted-foreground"> {description}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{dateFmt.format(timestamp)}</p>
          </div>
        </div>
        {body && <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap pl-13">{body}</div>}
        {footer && <div className="flex justify-end gap-2 pt-2 border-t border-border/60">{footer}</div>}
      </div>
    </article>
  )
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
      <div className="glass-card no-sheen flex flex-col items-center justify-center gap-3 py-20 text-center animate-fade-in mt-6">
        <Flower2 className="h-10 w-10 text-muted-foreground/50" />
        <p className="text-muted-foreground">Your inbox is empty.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 mt-6">
      {hasPending && (
        <section className="space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending action</h2>
          {pendingTributes.map((t) => <PendingTribute key={`t-${t.id}`} tribute={t} />)}
          {pendingFamilyRequests.map((r) => <PendingFamilyRequest key={`f-${r.id}`} request={r} sessionUserId={sessionUserId} />)}
        </section>
      )}

      {hasActivity && (
        <section className="space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent activity</h2>
          {recentActivity.map((a) => <ActivityCard key={a.id} item={a} />)}
        </section>
      )}
    </div>
  )
}

function PendingTribute({ tribute }: { tribute: MessagesData["pendingTributes"][number] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

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
    <MessageCard
      actor={tribute.author}
      description={<>wrote a tribute for <span className="font-medium text-foreground">{tribute.profileName}</span>.</>}
      timestamp={tribute.createdAt}
      imageUrl={tribute.imageUrl}
      body={tribute.text}
      footer={
        <>
          <Button size="sm" variant="outline" onClick={() => handle("reject")} disabled={isPending} className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10">
            <X className="h-3.5 w-3.5" /> Reject
          </Button>
          <Button size="sm" onClick={() => handle("approve")} disabled={isPending} className="gap-1.5">
            <Check className="h-3.5 w-3.5" /> Approve
          </Button>
        </>
      }
    />
  )
}

function PendingFamilyRequest({ request, sessionUserId }: { request: MessagesData["pendingFamilyRequests"][number]; sessionUserId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const requester = request.fromId === sessionUserId ? request.to : request.from
  const requesterIsParent = request.type === "PARENT_OF" && request.fromId === requester.id
  const role = relationLabel(request.type, request.subtype, requesterIsParent)

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
    <MessageCard
      actor={requester}
      description={<>sent you a request to join their tree as their <span className="font-medium text-foreground">{role}</span>.</>}
      timestamp={request.createdAt}
      footer={
        <>
          <Button size="sm" variant="outline" onClick={() => handle("reject")} disabled={isPending} className="gap-1.5">
            <X className="h-3.5 w-3.5" /> Decline
          </Button>
          <Button size="sm" onClick={() => handle("accept")} disabled={isPending} className="gap-1.5">
            <Check className="h-3.5 w-3.5" /> Accept
          </Button>
        </>
      }
    />
  )
}

function ActivityCard({ item }: { item: MessagesData["recentActivity"][number] }) {
  let description: React.ReactNode = null
  let href: string | null = null

  if (item.type === "TRIBUTE_APPROVED" || item.type === "TRIBUTE_REJECTED") {
    const approved = item.type === "TRIBUTE_APPROVED"
    description = approved
      ? <>approved your tribute.</>
      : <>declined your tribute.</>
    href = item.profileId ? `/profile/${item.profileId}/tributes` : null
  } else if (item.type === "FAMILY_REQUEST_ACCEPTED") {
    description = <>joined your family tree.</>
  } else if (item.type === "FAMILY_REQUEST_REJECTED") {
    description = <>declined your tree invitation.</>
  } else {
    return null
  }

  const actor: Actor = item.actor ?? { firstName: "Someone", lastName: "", avatarUrl: null }

  const card = (
    <MessageCard
      actor={actor}
      description={description}
      timestamp={item.createdAt}
      footer={href ? (
        <span className="inline-flex items-center text-xs text-muted-foreground gap-1">
          View <ArrowUpRight className="h-3 w-3" />
        </span>
      ) : undefined}
    />
  )

  return href ? <Link href={href} className="block">{card}</Link> : card
}
