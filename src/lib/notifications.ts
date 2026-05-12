import "server-only"

import { prisma } from "@/lib/prisma"

type NotificationType =
  | "TRIBUTE_PENDING"
  | "TRIBUTE_APPROVED"
  | "TRIBUTE_REJECTED"
  | "FAMILY_REQUEST_PENDING"
  | "FAMILY_REQUEST_ACCEPTED"
  | "FAMILY_REQUEST_REJECTED"

interface NotifyArgs {
  type:              NotificationType
  userId:            string
  actorId?:          string | null
  tributeId?:        string | null
  familyRelationId?: string | null
}

export async function notify(args: NotifyArgs) {
  await prisma.notification.create({
    data: {
      type:             args.type,
      userId:           args.userId,
      actorId:          args.actorId ?? null,
      tributeId:        args.tributeId ?? null,
      familyRelationId: args.familyRelationId ?? null,
    },
  })
}

export async function markNotificationsRead(userId: string, where: { tributeId?: string; familyRelationId?: string }) {
  await prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
      ...(where.tributeId        ? { tributeId:        where.tributeId        } : {}),
      ...(where.familyRelationId ? { familyRelationId: where.familyRelationId } : {}),
    },
    data: { readAt: new Date() },
  })
}

export async function markNotificationRead(notificationId: string, userId: string) {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId, readAt: null },
    data:  { readAt: new Date() },
  })
}
