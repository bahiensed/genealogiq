"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { Button, type buttonVariants } from "@/components/ui/button"
import { LimitReachedDialog, type LimitReachedContext } from "@/components/limit-reached-dialog"
import type { PlanTier } from "@/lib/plan-quotas"
import type { VariantProps } from "class-variance-authority"

interface Props extends VariantProps<typeof buttonVariants> {
  href: string
  atLimit: boolean
  limitContext: LimitReachedContext
  limit: number
  tier: PlanTier
  className?: string
  children: ReactNode
}

// A "new item" Link that's blocked by a plan quota — Documents/Places/
// Memorials all share this exact shape: below the limit it's a plain
// navigation link, at the limit the same-looking button instead opens
// LimitReachedDialog. Kept as one component so the check-then-navigate-or-
// gate logic isn't reimplemented per module.
export function QuotaGatedLink({ href, atLimit, limitContext, limit, tier, variant, size, className, children }: Props) {
  const [open, setOpen] = useState(false)

  if (atLimit) {
    return (
      <>
        <Button type="button" variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
          {children}
        </Button>
        <LimitReachedDialog open={open} onOpenChange={setOpen} context={limitContext} limit={limit} tier={tier} />
      </>
    )
  }

  return (
    <Button asChild variant={variant} size={size} className={className}>
      <Link href={href}>{children}</Link>
    </Button>
  )
}
