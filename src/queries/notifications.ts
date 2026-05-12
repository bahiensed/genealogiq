import "server-only"

import { prisma } from "@/lib/prisma"

export interface ActorSummary {
  id:        string
  firstName: string
  lastName:  string
  avatarUrl: string | null
}

export interface BellTributePending {
  id:        string
  createdAt: Date
  tributeId: string
  profileId: string
  actor:     ActorSummary | null
}

export interface BellTributeDecided {
  id:        string
  createdAt: Date
  type:      "TRIBUTE_APPROVED" | "TRIBUTE_REJECTED"
  tributeId: string
  profileId: string | null
  actor:     ActorSummary | null
}

export interface BellFamilyPending {
  id:               string
  createdAt:        Date
  familyRelationId: string
  actor:            ActorSummary | null
}

export interface BellFamilyDecided {
  id:               string
  createdAt:        Date
  type:             "FAMILY_REQUEST_ACCEPTED" | "FAMILY_REQUEST_REJECTED"
  familyRelationId: string
  actor:            ActorSummary | null
}

export interface BellNotifications {
  tributePending: BellTributePending[]
  tributeDecided: BellTributeDecided[]
  familyPending:  BellFamilyPending[]
  familyDecided:  BellFamilyDecided[]
  totalUnread:    number
}

export async function getBellNotifications(userId: string): Promise<BellNotifications> {
  const rows = await prisma.notification.findMany({
    where:   { userId, readAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, type: true, createdAt: true,
      tributeId: true,
      familyRelationId: true,
      tribute: { select: { profileId: true } },
      actor: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      },
    },
  })

  const result: BellNotifications = {
    tributePending: [],
    tributeDecided: [],
    familyPending:  [],
    familyDecided:  [],
    totalUnread:    rows.length,
  }

  for (const r of rows) {
    if (r.type === "TRIBUTE_PENDING" && r.tributeId) {
      result.tributePending.push({
        id:        r.id,
        createdAt: r.createdAt,
        tributeId: r.tributeId,
        profileId: r.tribute?.profileId ?? "",
        actor:     r.actor,
      })
    } else if ((r.type === "TRIBUTE_APPROVED" || r.type === "TRIBUTE_REJECTED") && r.tributeId) {
      result.tributeDecided.push({
        id:        r.id,
        createdAt: r.createdAt,
        type:      r.type,
        tributeId: r.tributeId,
        profileId: r.tribute?.profileId ?? null,
        actor:     r.actor,
      })
    } else if (r.type === "FAMILY_REQUEST_PENDING" && r.familyRelationId) {
      result.familyPending.push({
        id:               r.id,
        createdAt:        r.createdAt,
        familyRelationId: r.familyRelationId,
        actor:            r.actor,
      })
    } else if ((r.type === "FAMILY_REQUEST_ACCEPTED" || r.type === "FAMILY_REQUEST_REJECTED") && r.familyRelationId) {
      result.familyDecided.push({
        id:               r.id,
        createdAt:        r.createdAt,
        type:             r.type,
        familyRelationId: r.familyRelationId,
        actor:            r.actor,
      })
    }
  }

  return result
}

// For /family-requests page
export async function getPendingFamilyRequests(userId: string) {
  return prisma.familyRelation.findMany({
    where:   { status: "PENDING", OR: [{ fromId: userId }, { toId: userId }] },
    orderBy: { createdAt: "desc" },
    select: {
      id:           true,
      type:         true,
      subtype:      true,
      fromId:       true,
      toId:         true,
      startDate:    true,
      endDate:      true,
      requestedById: true,
      createdAt:    true,
      from: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      to:   { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
    },
  })
}
