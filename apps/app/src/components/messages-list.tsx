"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Check, X, User, Flower2, ArrowUpRight, Shield, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { approveTribute, rejectTribute } from "@/actions/tribute"
import { acceptFamilyRequest, rejectFamilyRequest } from "@/actions/family-tree"
import { approveGuardianship, rejectGuardianship } from "@/actions/guardian"
import { loadMoreActivity } from "@/actions/messages"
import type { ActivityCursor, InboxItem, MessagesData } from "@/queries/notifications"
import type { NotificationType } from "@/generated/prisma/enums"

const dateFmt = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })

function relationLabel(type: string, subtype: string | null, requesterIsParent: boolean): string {
  if (type === "SPOUSE")  return subtype === "partner" ? "partner" : "spouse"
  if (type === "SIBLING") return subtype === "half" ? "half-sibling" : "sibling"
  return requesterIsParent ? "parent" : "child"
}

interface Actor {
  firstName: string
  lastName:  string
  avatarUrl: string | null
}

function actorOrPlaceholder(actor: InboxItem["actor"]): Actor {
  return actor ?? { firstName: "Someone", lastName: "", avatarUrl: null }
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

// ─── Dispatch table ──────────────────────────────────────────────────────────
// All inbox cards are driven from this map keyed by NotificationType. Each
// entry knows how to describe itself, optionally where it links, and whether
// it has a footer with action buttons (pending items only).

type DispatchEntry = {
  describe: (item: InboxItem) => React.ReactNode
  body?:    (item: InboxItem) => React.ReactNode
  image?:   (item: InboxItem) => string | null
  href?:    (item: InboxItem) => string | null
  Footer?:  React.ComponentType<{ item: InboxItem }>
}

const DISPATCH: Record<NotificationType, DispatchEntry> = {
  TRIBUTE_PENDING: {
    describe: (i) => (
      <>
        wrote a tribute for{" "}
        <span className="font-medium text-foreground">{i.tribute?.profileName ?? "a profile"}</span>.
      </>
    ),
    body:   (i) => i.tribute?.text ?? null,
    image:  (i) => i.tribute?.imageUrl ?? null,
    Footer: TributeActions,
  },
  TRIBUTE_APPROVED: {
    describe: (i) => describeTributeResult(i, "approved"),
    href:     (i) => i.tribute ? `/profile/${i.tribute.profileId}/tributes` : null,
  },
  TRIBUTE_REJECTED: {
    describe: (i) => describeTributeResult(i, "rejected"),
    href:     (i) => i.tribute ? `/profile/${i.tribute.profileId}/tributes` : null,
  },
  FAMILY_REQUEST_PENDING: {
    describe: (i) => {
      const fr = i.familyRelation
      const role = fr ? relationLabel(fr.type, fr.subtype, fr.requesterIsParent) : "relative"
      return (
        <>
          sent you a request to join their tree as their{" "}
          <span className="font-medium text-foreground">{role}</span>.
        </>
      )
    },
    Footer: FamilyRequestActions,
  },
  FAMILY_REQUEST_ACCEPTED: {
    describe: (i) => i.viewerActed
      ? <>joined {actorName(i)}&apos;s family tree.</>
      : <>joined your family tree.</>,
  },
  FAMILY_REQUEST_REJECTED: {
    describe: (i) => i.viewerActed
      ? <>declined {actorName(i)}&apos;s tree invitation.</>
      : <>declined your tree invitation.</>,
  },
  GUARDIAN_REQUEST_PENDING: {
    describe: (i) => {
      const target = i.guardianProfile
      const targetName = target ? `${target.firstName} ${target.lastName}`.trim() : "this profile"
      return (
        <>
          wants to co-manage{" "}
          <span className="font-medium text-foreground">{targetName || "this profile"}</span>.
        </>
      )
    },
    Footer: GuardianRequestActions,
  },
  GUARDIAN_REQUEST_ACCEPTED: {
    describe: (i) => i.viewerActed
      ? <>granted {actorName(i)} co-management.</>
      : <>granted you co-management of a profile.</>,
    href: (i) => i.guardianProfile ? `/profile/${i.guardianProfile.id}` : null,
  },
  GUARDIAN_REQUEST_REJECTED: {
    describe: (i) => i.viewerActed
      ? <>declined {actorName(i)}&apos;s co-management request.</>
      : <>declined your co-management request.</>,
  },
}

function actorName(item: InboxItem): string {
  return item.actor ? `${item.actor.firstName} ${item.actor.lastName}`.trim() || "Someone" : "Someone"
}

function describeTributeResult(item: InboxItem, verb: "approved" | "rejected"): React.ReactNode {
  if (item.viewerActed) {
    return <>{verb} {actorName(item)}&apos;s tribute.</>
  }
  // Author-facing: "rejected" reads softer as "declined"
  return <>{verb === "approved" ? "approved" : "declined"} your tribute.</>
}

// ─── Renderer ────────────────────────────────────────────────────────────────

function InboxCard({ item, pending }: { item: InboxItem; pending: boolean }) {
  const entry = DISPATCH[item.type]
  if (!entry) return null

  // For activity cards where the viewer acted, headline reads "You" but we
  // keep the counterparty's avatar so the picture matches the description.
  const baseActor   = actorOrPlaceholder(item.actor)
  const displayActor: Actor = !pending && item.viewerActed
    ? { firstName: "You", lastName: "", avatarUrl: baseActor.avatarUrl }
    : baseActor

  const Footer = pending ? entry.Footer : undefined
  const href   = !pending ? entry.href?.(item) ?? null : null

  const card = (
    <MessageCard
      actor={displayActor}
      description={entry.describe(item)}
      timestamp={item.createdAt}
      body={entry.body?.(item)}
      imageUrl={entry.image?.(item) ?? null}
      footer={
        Footer
          ? <Footer item={item} />
          : href
            ? <span className="inline-flex items-center text-xs text-muted-foreground gap-1">View <ArrowUpRight className="h-3 w-3" /></span>
            : undefined
      }
    />
  )

  return href ? <Link href={href} className="block">{card}</Link> : card
}

// ─── Action footers ──────────────────────────────────────────────────────────

function TributeActions({ item }: { item: InboxItem }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handle = (action: "approve" | "reject") => {
    if (!item.tributeId || !item.tribute) return
    startTransition(async () => {
      const result = action === "approve"
        ? await approveTribute(item.tributeId!, item.tribute!.profileId)
        : await rejectTribute(item.tributeId!,  item.tribute!.profileId)
      if (result?.error) { toast.error(result.error); return }
      toast.success(action === "approve" ? "Tribute approved." : "Tribute rejected.")
      router.refresh()
    })
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => handle("reject")} disabled={isPending} className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10">
        <X className="h-3.5 w-3.5" /> Reject
      </Button>
      <Button size="sm" onClick={() => handle("approve")} disabled={isPending} className="gap-1.5">
        <Check className="h-3.5 w-3.5" /> Approve
      </Button>
    </>
  )
}

function FamilyRequestActions({ item }: { item: InboxItem }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handle = (action: "accept" | "reject") => {
    if (!item.familyRelationId) return
    startTransition(async () => {
      const result = action === "accept"
        ? await acceptFamilyRequest(item.familyRelationId!)
        : await rejectFamilyRequest(item.familyRelationId!)
      if (result?.error) { toast.error(result.error); return }
      toast.success(action === "accept" ? "Invitation accepted." : "Invitation declined.")
      router.refresh()
    })
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => handle("reject")} disabled={isPending} className="gap-1.5">
        <X className="h-3.5 w-3.5" /> Decline
      </Button>
      <Button size="sm" onClick={() => handle("accept")} disabled={isPending} className="gap-1.5">
        <Check className="h-3.5 w-3.5" /> Accept
      </Button>
    </>
  )
}

function GuardianRequestActions({ item }: { item: InboxItem }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handle = (action: "approve" | "reject") => {
    if (!item.appUserGuardianId) return
    startTransition(async () => {
      const result = action === "approve"
        ? await approveGuardianship({ guardianshipId: item.appUserGuardianId! })
        : await rejectGuardianship({  guardianshipId: item.appUserGuardianId! })
      if (result?.error) { toast.error(result.error); return }
      toast.success(action === "approve" ? "Co-management approved." : "Co-management declined.")
      router.refresh()
    })
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => handle("reject")} disabled={isPending} className="gap-1.5">
        <X className="h-3.5 w-3.5" /> Decline
      </Button>
      <Button size="sm" onClick={() => handle("approve")} disabled={isPending} className="gap-1.5">
        <Shield className="h-3.5 w-3.5" /> Approve
      </Button>
    </>
  )
}

// ─── Pagination ──────────────────────────────────────────────────────────────

function LoadMoreButton({
  initialCursor,
  onLoaded,
}: {
  initialCursor: ActivityCursor | null
  onLoaded:      (items: InboxItem[], next: ActivityCursor | null) => void
}) {
  const [cursor, setCursor] = useState<ActivityCursor | null>(initialCursor)
  const [isPending, startTransition] = useTransition()

  if (!cursor) return null

  const loadMore = () => {
    startTransition(async () => {
      const page = await loadMoreActivity(cursor)
      onLoaded(page.items, page.nextCursor)
      setCursor(page.nextCursor)
    })
  }

  return (
    <div className="flex justify-center pt-2">
      <Button size="sm" variant="outline" onClick={loadMore} disabled={isPending} className="gap-1.5">
        <ChevronDown className="h-3.5 w-3.5" /> {isPending ? "Loading…" : "Load more"}
      </Button>
    </div>
  )
}

// ─── Top-level list ──────────────────────────────────────────────────────────

interface Props {
  data: MessagesData
}

export function MessagesList({ data }: Props) {
  const [activity, setActivity] = useState<InboxItem[]>(data.activity)
  const hasPending  = data.pending.length > 0
  const hasActivity = activity.length > 0

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
          {data.pending.map((item) => <InboxCard key={item.id} item={item} pending />)}
        </section>
      )}

      {hasActivity && (
        <section className="space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent activity</h2>
          {activity.map((item) => <InboxCard key={item.id} item={item} pending={false} />)}
          <LoadMoreButton
            initialCursor={data.nextCursor}
            onLoaded={(items) => setActivity((prev) => [...prev, ...items])}
          />
        </section>
      )}
    </div>
  )
}
