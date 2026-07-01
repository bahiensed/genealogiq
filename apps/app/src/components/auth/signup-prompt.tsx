'use client'

import { useEffect, useState } from "react"
import { SignupDialog } from "@/components/auth/signup-dialog"

// Hard sign-up wall for the continuous content pages (bio, tributes). Renders nothing
// until the anonymous visitor has scrolled ~80% of the page, then locks it with a
// NON-dismissible dialog — they log in, sign up, or leave via the browser back button.
export function SignupPrompt() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let fired = false
    const onScroll = () => {
      if (fired) return
      const doc = document.documentElement
      const depth = (window.scrollY + window.innerHeight) / doc.scrollHeight
      if (window.scrollY > 80 && depth >= 0.8) {
        fired = true
        setOpen(true)
        window.removeEventListener("scroll", onScroll)
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return <SignupDialog open={open} onOpenChange={setOpen} dismissible={false} />
}
