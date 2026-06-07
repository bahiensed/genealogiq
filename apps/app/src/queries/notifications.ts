import "server-only"

import { prisma } from "@/lib/prisma"
import type { NotificationType } from '@genealogiq/db'

const PENDING_TYPES = [
  "TRIBUTE_PENDING",
  "FAMILY_REQUEST_PENDING",
  "GUARDIAN_REQUEST_PENDING",
] as const satisfies readonly NotificationType[]

const ACTIVITY_TYPES = [
  "TRIBUTE_APPROVED",
  "TRIBUTE_REJECTED",
  "FAMILY_REQUEST_ACCEPTED",
  "FAMILY_REQUEST_REJECTED",
  "GUARDIAN_REQUEST_ACCEPTED",
  "GUARDIAN_REQUEST_REJECTED",
] as const satisfies readonly NotificationType[]

export const ACTIVITY_PAGE_SIZE = 20

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } })
}

interface ActorSummary {
  id:        string
  firstName: string
  lastName:  string
  avatarUrl: string | null
}

interface ProfileSummary {
  id:        string
  firstName: string
  lastName:  string
  avatarUrl: string | null
  role:      string
}

export interface InboxItem {
  id:        string
  type:      NotificationType
  createdAt: Date
  /** Whoever's avatar/name should headline the card (the counterparty). Null only when actor was deleted. */
  actor:     ActorSummary | null
  /** True when the viewer was the one who took the action; false when they received it. */
  viewerActed: boolean
  /** Optional related ids for action buttons + deep-links. */
  tributeId:         string | null
  familyRelationId:  string | null
  appUserGuardianId: string | null
  /** Type-specific extras eagerly resolved server-side so the renderer stays dumb. */
  tribute?:          { text: string; imageUrl: string | null; profileId: string; profileName: string } | null
  familyRelation?:   { type: string; subtype: string | null; requesterIsParent: boolean } | null
  guardianProfile?:  ProfileSummary | null
}

export interface MessagesData {
  pending:    InboxItem[]
  activity:   InboxItem[]
  nextCursor: ActivityCursor | null
}

export interface ActivityCursor {
  id:        string
  createdAt: string // ISO — serializable across server/client
}

const COMMON_SELECT = {
  id: true, type: true, createdAt: true,
  userId: true,
  tributeId: true, familyRelationId: true, appUserGuardianId: true,
  actor: {
    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
  },
  tribute: {
    select: {
      text: true, imageUrl: true, profileId: true, authorId: true,
      profile: { select: { firstName: true, lastName: true } },
    },
  },
  familyRelation: {
    select: { type: true, subtype: true, fromId: true, toId: true, requestedById: true },
  },
  appUserGuardian: {
    select: {
      requestedById: true, appUserId: true,
      appUser: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true } },
    },
  },
} as const

type RawNotification = {
  id: string
  type: NotificationType
  createdAt: Date
  userId: string
  tributeId: string | null
  familyRelationId: string | null
  appUserGuardianId: string | null
  actor: ActorSummary | null
  tribute: {
    text: string
    imageUrl: string | null
    profileId: string
    authorId: string
    profile: { firstName: string; lastName: string }
  } | null
  familyRelation: {
    type: string
    subtype: string | null
    fromId: string
    toId: string
    requestedById: string | null
  } | null
  appUserGuardian: {
    requestedById: string | null
    appUserId: string
    appUser: ProfileSummary
  } | null
}

function toInboxItem(n: RawNotification, viewerId: string): InboxItem {
  let viewerActed = false
  if (n.tribute) {
    // Viewer is the moderator when they are NOT the tribute's author.
    viewerActed = n.tribute.authorId !== viewerId
  } else if (n.familyRelation && n.familyRelation.requestedById) {
    viewerActed = n.familyRelation.requestedById !== viewerId
  } else if (n.appUserGuardian && n.appUserGuardian.requestedById) {
    viewerActed = n.appUserGuardian.requestedById !== viewerId
  }

  const tribute = n.tribute
    ? {
        text:        n.tribute.text,
        imageUrl:    n.tribute.imageUrl,
        profileId:   n.tribute.profileId,
        profileName: `${n.tribute.profile.firstName} ${n.tribute.profile.lastName}`.trim(),
      }
    : null

  const familyRelation = n.familyRelation
    ? {
        type:    n.familyRelation.type,
        subtype: n.familyRelation.subtype,
        // For PARENT_OF the requester is the parent when they sit on the fromId side.
        requesterIsParent:
          n.familyRelation.type === "PARENT_OF" &&
          n.familyRelation.requestedById === n.familyRelation.fromId,
      }
    : null

  const guardianProfile = n.appUserGuardian?.appUser ?? null

  return {
    id:               n.id,
    type:             n.type,
    createdAt:        n.createdAt,
    actor:            n.actor,
    viewerActed,
    tributeId:         n.tributeId,
    familyRelationId:  n.familyRelationId,
    appUserGuardianId: n.appUserGuardianId,
    tribute,
    familyRelation,
    guardianProfile,
  }
}

export async function getActivityPage(
  userId: string,
  cursor: ActivityCursor | null,
): Promise<{ items: InboxItem[]; nextCursor: ActivityCursor | null }> {
  const rows = await prisma.notification.findMany({
    where:   { userId, type: { in: [...ACTIVITY_TYPES] } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take:    ACTIVITY_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor.id }, skip: 1 } : {}),
    select:  COMMON_SELECT,
  })

  const hasMore = rows.length > ACTIVITY_PAGE_SIZE
  const sliced  = hasMore ? rows.slice(0, ACTIVITY_PAGE_SIZE) : rows
  const last    = sliced.at(-1)
  const nextCursor: ActivityCursor | null = hasMore && last
    ? { id: last.id, createdAt: last.createdAt.toISOString() }
    : null

  return {
    items:      sliced.map((r) => toInboxItem(r as RawNotification, userId)),
    nextCursor,
  }
}

export async function getMessages(userId: string): Promise<MessagesData> {
  const [pending, activity] = await Promise.all([
    prisma.notification.findMany({
      where:   { userId, type: { in: [...PENDING_TYPES] } },
      orderBy: [{ createdAt: "asc" }],
      select:  COMMON_SELECT,
    }),
    getActivityPage(userId, null),
  ])

  return {
    pending:    pending.map((r) => toInboxItem(r as RawNotification, userId)),
    activity:   activity.items,
    nextCursor: activity.nextCursor,
  }
}
