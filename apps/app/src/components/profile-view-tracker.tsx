'use client'

import { useEffect } from "react"
import { recordView, type RecentProfileInput } from "@/hooks/use-recently-viewed"

export function ProfileViewTracker({ profile }: { profile: RecentProfileInput }) {
  useEffect(() => {
    recordView(profile)
    // profile.id is stable per page load; other fields may be serialized references
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id])
  return null
}
