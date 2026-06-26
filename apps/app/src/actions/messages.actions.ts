"use server"

import { verifySession } from "@/lib/dal"
import { getActivityPage, type ActivityCursor, type InboxItem } from "@/queries/notifications"

export async function loadMoreActivity(
  cursor: ActivityCursor,
): Promise<{ items: InboxItem[]; nextCursor: ActivityCursor | null }> {
  const session = await verifySession()
  return getActivityPage(session.user.id, cursor)
}
