import "server-only"

import { prisma } from "@/lib/prisma"

interface ActorSummary {
  id:        string
  firstName: string
  lastName:  string
  avatarUrl: string | null
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } })
}

export interface MessagesData {
  pendingTributes: {
    id: string
    text: string
    imageUrl: string | null
    createdAt: Date
    profileId: string
    profileName: string
    author: ActorSummary
  }[]
  pendingFamilyRequests: {
    id:        string
    type:      string
    subtype:   string | null
    fromId:    string
    toId:      string
    createdAt: Date
    from:      ActorSummary
    to:        ActorSummary
  }[]
  recentActivity: {
    id:        string
    type:      string
    createdAt: Date
    actor:     ActorSummary | null
    tributeId: string | null
    profileId: string | null
    familyRelationId: string | null
  }[]
}

export async function getMessages(userId: string): Promise<MessagesData> {
  const [pendingTributes, pendingFamilyRequests, recentActivity] = await Promise.all([
    // Tributes awaiting moderation by this user (they manage the target profile)
    prisma.tribute.findMany({
      where: {
        status: "PENDING",
        profile: {
          OR: [
            { id: userId },
            { guardedBy: { some: { guardianId: userId } } },
          ],
        },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, text: true, imageUrl: true, createdAt: true,
        profileId: true,
        profile: { select: { firstName: true, lastName: true } },
        author:  { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    }),
    // Family-tree invitations awaiting this user's response
    prisma.familyRelation.findMany({
      where:   { status: "PENDING", OR: [{ fromId: userId }, { toId: userId }] },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, type: true, subtype: true, fromId: true, toId: true, createdAt: true,
        from: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        to:   { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    }),
    // Recent info-only notifications (everything read for activity log)
    prisma.notification.findMany({
      where:   { userId, type: { in: ["TRIBUTE_APPROVED", "TRIBUTE_REJECTED", "FAMILY_REQUEST_ACCEPTED", "FAMILY_REQUEST_REJECTED"] } },
      orderBy: { createdAt: "desc" },
      take:    50,
      select: {
        id: true, type: true, createdAt: true,
        tributeId: true,
        familyRelationId: true,
        tribute: { select: { profileId: true } },
        actor:   { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    }),
  ])

  return {
    pendingTributes: pendingTributes.map((t) => ({
      id:          t.id,
      text:        t.text,
      imageUrl:    t.imageUrl,
      createdAt:   t.createdAt,
      profileId:   t.profileId,
      profileName: `${t.profile.firstName} ${t.profile.lastName}`,
      author:      t.author,
    })),
    pendingFamilyRequests,
    recentActivity: recentActivity.map((n) => ({
      id:               n.id,
      type:             n.type,
      createdAt:        n.createdAt,
      actor:            n.actor,
      tributeId:        n.tributeId,
      profileId:        n.tribute?.profileId ?? null,
      familyRelationId: n.familyRelationId,
    })),
  }
}
