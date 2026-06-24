'use client'

import { useMemo } from "react"
import { useTranslations } from "next-intl"

interface Props {
  firstName: string
}

export function Greeting({ firstName }: Props) {
  const t = useTranslations("Home")

  const hello = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return t("goodMorning")
    if (h < 18) return t("goodAfternoon")
    return t("goodEvening")
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      {hello}, <span className="text-gradient-brand">{firstName}</span>
    </>
  )
}
