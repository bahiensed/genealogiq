'use client'

import { useRecentlyViewed } from "@/hooks/use-recently-viewed"

export function RecentlyViewedCount() {
  const profiles = useRecentlyViewed()
  return <>{profiles.length}</>
}
