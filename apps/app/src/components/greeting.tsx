'use client'

import { useMemo } from "react"
import { useTranslations } from "next-intl"

interface Props {
  firstName: string
}

export function Greeting({ firstName }: Props) {
  const t = useTranslations("Home")

  // Pick the time-of-day key once on mount; translate in render so a live
  // locale switch (the switcher calls router.refresh(), which re-binds `t`)
  // updates the greeting too. Memoizing the translated string instead would
  // freeze it in the mount-time language until the component remounts.
  const greetingKey = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return "goodMorning"
    if (h < 18) return "goodAfternoon"
    return "goodEvening"
  }, [])

  return (
    <>
      {t(greetingKey)}, <span className="text-gradient-brand">{firstName}</span>
    </>
  )
}
