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
  pendingGuardianRequests: {
    id:          string
    createdAt:   Date
    requester:   ActorSummary
    profile: {
      id:        string
      firstName: string
      lastName:  string
      avatarUrl: string | null
      role:      string
    }
  }[]
  recentActivity: {
    id:        string
    type:      string
    createdAt: Date
    actor:     ActorSummary | null
    tributeId: string | null
    profileId: string | null
    /** True when the viewer was the one who took the action (moderator/accepter), false when they received it (author/requester). */
    viewerActed: boolean
    familyRelationId:  string | null
    appUserGuardianId: string | null
  }[]
}

export async function getMessages(userId: string): Promise<MessagesData> {
  const [pendingTributes, pendingFamilyRequests, pendingGuardianRequests, recentActivity] = await Promise.all([
    // Tributes awaiting moderation by this user (they manage the target profile)
    prisma.tribute.findMany({
      where: {
        status: "PENDING",
        profile: {
          OR: [
            { id: userId },
            { guardedBy: { some: { guardianId: userId, status: "ACCEPTED" } } },
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
    // Co-guardianship requests awaiting this user's approval (they manage the target profile)
    prisma.appUserGuardian.findMany({
      where: {
        status: "PENDING",
        appUser: {
          OR: [
            { id: userId },
            { guardedBy: { some: { guardianId: userId, status: "ACCEPTED" } } },
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id:        true,
        createdAt: true,
        requestedBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        appUser: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true },
        },
      },
    }),
    // Recent info-only notifications (everything read for activity log)
    prisma.notification.findMany({
      where:   { userId, type: { in: ["TRIBUTE_APPROVED", "TRIBUTE_REJECTED", "FAMILY_REQUEST_ACCEPTED", "FAMILY_REQUEST_REJECTED", "GUARDIAN_REQUEST_ACCEPTED", "GUARDIAN_REQUEST_REJECTED"] } },
      orderBy: { createdAt: "desc" },
      take:    50,
      select: {
        id: true, type: true, createdAt: true,
        tributeId: true,
        familyRelationId: true,
        appUserGuardianId: true,
        // Pull tribute.authorId so we can tell whether the viewer is the tribute
        // author ("your tribute was approved") or the moderator ("you approved …").
        tribute:        { select: { profileId: true, authorId: true } },
        // Pull familyRelation.requestedById so we can tell whether the viewer
        // sent the invite ("X joined your tree") or received and acted on it
        // ("you joined X's tree").
        familyRelation:  { select: { requestedById: true } },
        // Same idea for guardianship requests.
        appUserGuardian: { select: { requestedById: true, appUserId: true } },
        actor:           { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
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
    pendingGuardianRequests: pendingGuardianRequests
      .filter((g) => g.requestedBy !== null)
      .map((g) => ({
        id:        g.id,
        createdAt: g.createdAt,
        requester: g.requestedBy!,
        profile:   g.appUser,
      })),
    recentActivity: recentActivity.map((n) => {
      let viewerActed = false
      let profileId: string | null = n.tribute?.profileId ?? null
      if (n.tribute) {
        // Viewer is the moderator when they are NOT the tribute's author.
        viewerActed = n.tribute.authorId !== userId
      } else if (n.familyRelation) {
        // Viewer accepted/rejected when they are NOT the one who sent the invite.
        viewerActed = n.familyRelation.requestedById !== userId
      } else if (n.appUserGuardian) {
        viewerActed = n.appUserGuardian.requestedById !== userId
        profileId   = n.appUserGuardian.appUserId
      }
      return {
        id:                n.id,
        type:              n.type,
        createdAt:         n.createdAt,
        actor:             n.actor,
        tributeId:         n.tributeId,
        profileId,
        familyRelationId:  n.familyRelationId,
        appUserGuardianId: n.appUserGuardianId,
        viewerActed,
      }
    }),
  }
}
