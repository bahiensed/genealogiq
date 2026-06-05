'use client'

import { useEffect } from "react"
import { recordView } from "@/hooks/use-recently-viewed"
import type { MiniProfile } from "@/components/profile-mini-card"

export function ProfileViewTracker({ profile }: { profile: MiniProfile }) {
  useEffect(() => {
    recordView(profile)
    // profile.id is stable per page load; other fields may be serialized references
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id])
  return null
}
