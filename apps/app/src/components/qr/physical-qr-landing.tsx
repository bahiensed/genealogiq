'use client'

import Link from "next/link"
import { QrCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatGenCode } from "@/lib/gen-code"

interface PhysicalQrLandingProps {
  genCode: string
}

export function PhysicalQrLanding({ genCode }: PhysicalQrLandingProps) {
  const callbackUrl = `/qr/${genCode}`

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 text-center px-4">
      <div className="rounded-full bg-primary/10 p-6">
        <QrCode className="h-14 w-14 text-primary" />
      </div>

      <div className="space-y-3 max-w-md">
        <h1 className="text-3xl font-bold tracking-tight">Create a Memorial</h1>
        <p className="text-muted-foreground">
          This QR code is ready to be linked to a memorial profile.
        </p>
      </div>

      <div className="rounded-lg border bg-card px-6 py-3">
        <p className="text-xs text-muted-foreground mb-1">Activation code</p>
        <p className="font-mono text-xl font-semibold tracking-widest">{formatGenCode(genCode)}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <Button asChild className="flex-1">
          <Link href={`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`}>
            Sign in
          </Link>
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <Link href={`/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}`}>
            Create account
          </Link>
        </Button>
      </div>
    </div>
  )
}
