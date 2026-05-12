'use client'

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, X, User } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { acceptFamilyRequest, rejectFamilyRequest } from "@/actions/family-tree"
import { cn } from "@/lib/utils"

interface Endpoint {
  id:        string
  firstName: string
  lastName:  string
  avatarUrl: string | null
}

interface Request {
  id:        string
  type:      string
  subtype:   string | null
  fromId:    string
  toId:      string
  startDate: string | null
  endDate:   string | null
  createdAt: string
  from:      Endpoint
  to:        Endpoint
}

interface Props {
  sessionUserId: string
  requests:      Request[]
}

function relationLabel(type: string, subtype: string | null, requesterIsParent: boolean): string {
  if (type === "SPOUSE")  return subtype === "partner" ? "partner" : "spouse"
  if (type === "SIBLING") return subtype === "half" ? "half-sibling" : "sibling"
  // PARENT_OF — directionality matters: requesterIsParent means requester wants to be your parent.
  return requesterIsParent ? "parent" : "child"
}

export function FamilyRequestsClient({ sessionUserId, requests }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleAccept = (id: string) => {
    startTransition(async () => {
      const result = await acceptFamilyRequest(id)
      if (result?.error) { toast.error(result.error); return }
      toast.success("Invitation accepted.")
      router.refresh()
    })
  }

  const handleReject = (id: string) => {
    startTransition(async () => {
      const result = await rejectFamilyRequest(id)
      if (result?.error) { toast.error(result.error); return }
      toast.success("Invitation declined.")
      router.refresh()
    })
  }

  return (
    <ul className="space-y-3">
      {requests.map((r) => {
        // The requester is the OTHER endpoint (not the session user).
        const requester = r.fromId === sessionUserId ? r.to : r.from
        // For PARENT_OF: if fromId == requester, requester is the parent (wants me as child).
        const requesterIsParent = r.type === "PARENT_OF" && r.fromId === requester.id
        const initials = `${requester.firstName[0] ?? ""}${requester.lastName[0] ?? ""}`.toUpperCase()
        const role = relationLabel(r.type, r.subtype, requesterIsParent)

        return (
          <li key={r.id} className="glass-card no-sheen p-4 flex items-center gap-4 animate-fade-in">
            <div className={cn("h-12 w-12 rounded-full overflow-hidden shrink-0 bg-muted flex items-center justify-center ring-2 ring-border/50")}>
              {requester.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={requester.avatarUrl} alt={`${requester.firstName} ${requester.lastName}`} className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-semibold text-muted-foreground">{initials || <User className="h-4 w-4" />}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-semibold">{requester.firstName} {requester.lastName}</span>
                <span className="text-muted-foreground"> wants to add you as their </span>
                <span className="font-medium">{role}</span>
                <span className="text-muted-foreground">.</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(r.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                onClick={() => handleReject(r.id)}
                disabled={isPending}
                variant="outline"
                size="sm"
                className="gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Decline
              </Button>
              <Button
                onClick={() => handleAccept(r.id)}
                disabled={isPending}
                size="sm"
                className="gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                Accept
              </Button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
