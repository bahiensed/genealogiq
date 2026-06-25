"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { Check, X, User, Flower2, ArrowUpRight, Shield, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { approveTribute, rejectTribute } from "@/actions/tribute"
import { acceptFamilyRequest, rejectFamilyRequest } from "@/actions/family-tree"
import { approveGuardianship, rejectGuardianship } from "@/actions/guardian"
import { loadMoreActivity } from "@/actions/messages"
import type { ActivityCursor, InboxItem, MessagesData } from "@/queries/notifications"
import type { NotificationType } from '@genealogiq/db'

// Translation function bound to the "Messages" namespace.
type T = ReturnType<typeof useTranslations<"Messages">>

// Maps a family-relation type/subtype to a translation key for the role noun.
function relationLabelKey(type: string, subtype: string | null, requesterIsParent: boolean): string {
  if (type === "SPOUSE")  return subtype === "partner" ? "relation.partner" : "relation.spouse"
  if (type === "SIBLING") return subtype === "half" ? "relation.halfSibling" : "relation.sibling"
  return requesterIsParent ? "relation.parent" : "relation.child"
}

interface Actor {
  firstName: string
  lastName:  string
  avatarUrl: string | null
}

function actorOrPlaceholder(actor: InboxItem["actor"], t: T): Actor {
  return actor ?? { firstName: t("someone"), lastName: "", avatarUrl: null }
}

interface MessageCardProps {
  actor:        Actor
  description:  React.ReactNode
  timestamp:    Date
  placeholder:  string
  dateFmt:      Intl.DateTimeFormat
  body?:        React.ReactNode
  imageUrl?:    string | null
  footer?:      React.ReactNode
}

function MessageCard({ actor, description, timestamp, placeholder, dateFmt, body, imageUrl, footer }: MessageCardProps) {
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
              <span className="font-semibold">{name || placeholder}</span>
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
// it has a footer with action buttons (pending items only). The `describe`
// and `body` builders receive the bound translation function.

type DispatchEntry = {
  describe: (item: InboxItem, t: T) => React.ReactNode
  body?:    (item: InboxItem) => React.ReactNode
  image?:   (item: InboxItem) => string | null
  href?:    (item: InboxItem) => string | null
  Footer?:  React.ComponentType<{ item: InboxItem }>
}

// Renders the emphasized chunks inside rich messages.
const strong = (chunks: React.ReactNode) => <span className="font-medium text-foreground">{chunks}</span>

const DISPATCH: Record<NotificationType, DispatchEntry> = {
  TRIBUTE_PENDING: {
    describe: (i, t) => t.rich("describe.tributePending", {
      profile: i.tribute?.profileName ?? t("aProfile"),
      strong,
    }),
    body:   (i) => i.tribute?.text ?? null,
    image:  (i) => i.tribute?.imageUrl ?? null,
    Footer: TributeActions,
  },
  TRIBUTE_APPROVED: {
    describe: (i, t) => describeTributeResult(i, "approved", t),
    href:     (i) => i.tribute ? `/profile/${i.tribute.profileId}/tributes` : null,
  },
  TRIBUTE_REJECTED: {
    describe: (i, t) => describeTributeResult(i, "rejected", t),
    href:     (i) => i.tribute ? `/profile/${i.tribute.profileId}/tributes` : null,
  },
  FAMILY_REQUEST_PENDING: {
    describe: (i, t) => {
      const fr = i.familyRelation
      const role = fr ? t(relationLabelKey(fr.type, fr.subtype, fr.requesterIsParent)) : t("relation.relative")
      return t.rich("describe.familyRequestPending", { role, strong })
    },
    Footer: FamilyRequestActions,
  },
  FAMILY_REQUEST_ACCEPTED: {
    describe: (i, t) => i.viewerActed
      ? t("describe.familyAcceptedByViewer", { name: actorName(i, t) })
      : t("describe.familyAcceptedByActor"),
  },
  FAMILY_REQUEST_REJECTED: {
    describe: (i, t) => i.viewerActed
      ? t("describe.familyRejectedByViewer", { name: actorName(i, t) })
      : t("describe.familyRejectedByActor"),
  },
  GUARDIAN_REQUEST_PENDING: {
    describe: (i, t) => {
      const target = i.guardianProfile
      const targetName = target ? `${target.firstName} ${target.lastName}`.trim() : ""
      return t.rich("describe.guardianRequestPending", {
        target: targetName || t("thisProfile"),
        strong,
      })
    },
    Footer: GuardianRequestActions,
  },
  GUARDIAN_REQUEST_ACCEPTED: {
    describe: (i, t) => i.viewerActed
      ? t("describe.guardianAcceptedByViewer", { name: actorName(i, t) })
      : t("describe.guardianAcceptedByActor"),
    href: (i) => i.guardianProfile ? `/profile/${i.guardianProfile.id}` : null,
  },
  GUARDIAN_REQUEST_REJECTED: {
    describe: (i, t) => i.viewerActed
      ? t("describe.guardianRejectedByViewer", { name: actorName(i, t) })
      : t("describe.guardianRejectedByActor"),
  },
}

function actorName(item: InboxItem, t: T): string {
  return item.actor ? `${item.actor.firstName} ${item.actor.lastName}`.trim() || t("someone") : t("someone")
}

function describeTributeResult(item: InboxItem, verb: "approved" | "rejected", t: T): React.ReactNode {
  if (item.viewerActed) {
    return verb === "approved"
      ? t("describe.tributeApprovedByViewer", { name: actorName(item, t) })
      : t("describe.tributeRejectedByViewer", { name: actorName(item, t) })
  }
  // Author-facing: "rejected" reads softer as "declined"
  return verb === "approved"
    ? t("describe.tributeApprovedForAuthor")
    : t("describe.tributeDeclinedForAuthor")
}

// ─── Renderer ────────────────────────────────────────────────────────────────

function InboxCard({ item, pending, t, dateFmt }: { item: InboxItem; pending: boolean; t: T; dateFmt: Intl.DateTimeFormat }) {
  const entry = DISPATCH[item.type]
  if (!entry) return null

  // For activity cards where the viewer acted, headline reads "You" but we
  // keep the counterparty's avatar so the picture matches the description.
  const baseActor   = actorOrPlaceholder(item.actor, t)
  const displayActor: Actor = !pending && item.viewerActed
    ? { firstName: t("you"), lastName: "", avatarUrl: baseActor.avatarUrl }
    : baseActor

  const Footer = pending ? entry.Footer : undefined
  const href   = !pending ? entry.href?.(item) ?? null : null

  const card = (
    <MessageCard
      actor={displayActor}
      description={entry.describe(item, t)}
      timestamp={item.createdAt}
      placeholder={t("someone")}
      dateFmt={dateFmt}
      body={entry.body?.(item)}
      imageUrl={entry.image?.(item) ?? null}
      footer={
        Footer
          ? <Footer item={item} />
          : href
            ? <span className="inline-flex items-center text-xs text-muted-foreground gap-1">{t("view")} <ArrowUpRight className="h-3 w-3" /></span>
            : undefined
      }
    />
  )

  return href ? <Link href={href} className="block">{card}</Link> : card
}

// ─── Action footers ──────────────────────────────────────────────────────────

function TributeActions({ item }: { item: InboxItem }) {
  const router = useRouter()
  const t = useTranslations("Messages")
  const [isPending, startTransition] = useTransition()

  const handle = (action: "approve" | "reject") => {
    if (!item.tributeId || !item.tribute) return
    startTransition(async () => {
      const result = action === "approve"
        ? await approveTribute(item.tributeId!, item.tribute!.profileId)
        : await rejectTribute(item.tributeId!,  item.tribute!.profileId)
      if (!result.ok) { toast.error(result.message); return }
      toast.success(action === "approve" ? t("toasts.tributeApproved") : t("toasts.tributeRejected"))
      router.refresh()
    })
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => handle("reject")} disabled={isPending} className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10">
        <X className="h-3.5 w-3.5" /> {t("actions.reject")}
      </Button>
      <Button size="sm" onClick={() => handle("approve")} disabled={isPending} className="gap-1.5">
        <Check className="h-3.5 w-3.5" /> {t("actions.approve")}
      </Button>
    </>
  )
}

function FamilyRequestActions({ item }: { item: InboxItem }) {
  const router = useRouter()
  const t = useTranslations("Messages")
  const [isPending, startTransition] = useTransition()

  const handle = (action: "accept" | "reject") => {
    if (!item.familyRelationId) return
    startTransition(async () => {
      const result = action === "accept"
        ? await acceptFamilyRequest(item.familyRelationId!)
        : await rejectFamilyRequest(item.familyRelationId!)
      if (!result.ok) { toast.error(result.message); return }
      toast.success(action === "accept" ? t("toasts.invitationAccepted") : t("toasts.invitationDeclined"))
      router.refresh()
    })
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => handle("reject")} disabled={isPending} className="gap-1.5">
        <X className="h-3.5 w-3.5" /> {t("actions.decline")}
      </Button>
      <Button size="sm" onClick={() => handle("accept")} disabled={isPending} className="gap-1.5">
        <Check className="h-3.5 w-3.5" /> {t("actions.accept")}
      </Button>
    </>
  )
}

function GuardianRequestActions({ item }: { item: InboxItem }) {
  const router = useRouter()
  const t = useTranslations("Messages")
  const [isPending, startTransition] = useTransition()

  const handle = (action: "approve" | "reject") => {
    if (!item.appUserGuardianId) return
    startTransition(async () => {
      const result = action === "approve"
        ? await approveGuardianship({ guardianshipId: item.appUserGuardianId! })
        : await rejectGuardianship({  guardianshipId: item.appUserGuardianId! })
      if (!result.ok) { toast.error(result.message); return }
      toast.success(action === "approve" ? t("toasts.coManagementApproved") : t("toasts.coManagementDeclined"))
      router.refresh()
    })
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => handle("reject")} disabled={isPending} className="gap-1.5">
        <X className="h-3.5 w-3.5" /> {t("actions.decline")}
      </Button>
      <Button size="sm" onClick={() => handle("approve")} disabled={isPending} className="gap-1.5">
        <Shield className="h-3.5 w-3.5" /> {t("actions.approve")}
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
  const t = useTranslations("Messages")
  const tc = useTranslations("Common")
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
        <ChevronDown className="h-3.5 w-3.5" /> {isPending ? tc("loading") : t("loadMore")}
      </Button>
    </div>
  )
}

// ─── Top-level list ──────────────────────────────────────────────────────────

interface Props {
  data: MessagesData
}

export function MessagesList({ data }: Props) {
  const t = useTranslations("Messages")
  const locale = useLocale()
  const dateFmt = new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })
  const [activity, setActivity] = useState<InboxItem[]>(data.activity)
  const hasPending  = data.pending.length > 0
  const hasActivity = activity.length > 0

  if (!hasPending && !hasActivity) {
    return (
      <div className="glass-card no-sheen flex flex-col items-center justify-center gap-3 py-20 text-center animate-fade-in mt-6">
        <Flower2 className="h-10 w-10 text-muted-foreground/50" />
        <p className="text-muted-foreground">{t("empty")}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 mt-6">
      {hasPending && (
        <section className="space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("pendingAction")}</h2>
          {data.pending.map((item) => <InboxCard key={item.id} item={item} pending t={t} dateFmt={dateFmt} />)}
        </section>
      )}

      {hasActivity && (
        <section className="space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("recentActivity")}</h2>
          {activity.map((item) => <InboxCard key={item.id} item={item} pending={false} t={t} dateFmt={dateFmt} />)}
          <LoadMoreButton
            initialCursor={data.nextCursor}
            onLoaded={(items) => setActivity((prev) => [...prev, ...items])}
          />
        </section>
      )}
    </div>
  )
}
