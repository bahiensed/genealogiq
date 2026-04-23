'use client'

import { useMemo } from "react"

interface Props {
  firstName: string
}

export function Greeting({ firstName }: Props) {
  const hello = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return "Good morning"
    if (h < 18) return "Good afternoon"
    return "Good evening"
  }, [])

  return (
    <>
      {hello}, <span className="text-gradient-brand">{firstName}</span>
    </>
  )
}
