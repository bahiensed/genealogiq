import "server-only"

import { after } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendPushForNotification } from "@/lib/push"

type NotificationType =
  | "TRIBUTE_PENDING"
  | "TRIBUTE_APPROVED"
  | "TRIBUTE_REJECTED"
  | "FAMILY_REQUEST_PENDING"
  | "FAMILY_REQUEST_ACCEPTED"
  | "FAMILY_REQUEST_REJECTED"
  | "GUARDIAN_REQUEST_PENDING"
  | "GUARDIAN_REQUEST_ACCEPTED"
  | "GUARDIAN_REQUEST_REJECTED"

interface NotifyArgs {
  type:               NotificationType
  userId:             string
  actorId?:           string | null
  tributeId?:         string | null
  familyRelationId?:  string | null
  appUserGuardianId?: string | null
}

export async function notify(args: NotifyArgs) {
  await prisma.notification.create({
    data: {
      type:              args.type,
      userId:            args.userId,
      actorId:           args.actorId ?? null,
      tributeId:         args.tributeId ?? null,
      familyRelationId:  args.familyRelationId ?? null,
      appUserGuardianId: args.appUserGuardianId ?? null,
    },
  })
  // Web push fan-out runs after the response is flushed — it never slows the
  // calling action, and sendPushForNotification never throws.
  after(() => sendPushForNotification(args))
}

export async function markNotificationsRead(
  userId: string,
  where: { tributeId?: string; familyRelationId?: string; appUserGuardianId?: string },
) {
  await prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
      ...(where.tributeId         ? { tributeId:         where.tributeId         } : {}),
      ...(where.familyRelationId  ? { familyRelationId:  where.familyRelationId  } : {}),
      ...(where.appUserGuardianId ? { appUserGuardianId: where.appUserGuardianId } : {}),
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
