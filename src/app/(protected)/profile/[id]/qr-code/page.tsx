import Link from "next/link"
import { notFound } from "next/navigation"
import { Lock, QrCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { QrCodeClient } from "@/components/qr-code-client"
import { verifySession } from "@/lib/dal"
import { getProfileById } from "@/queries/profile"

interface Props {
  params: Promise<{ id: string }>
}

export default async function QrCodePage({ params }: Props) {
  const { id } = await params
  const session = await verifySession()

  const profile = await getProfileById(id)
  if (!profile) notFound()

  const isFreeMemorial = profile.role === "APP_MEMO" && profile.appSaleId == null
  const isGuardian = profile.role === "APP_MEMO" && profile.guardedBy.some((g) => g.guardianId === session.user.id)

  const appUrl = process.env.APP_URL ?? "https://genealogiq.app"
  const profileUrl = `${appUrl}/profile/${id}`

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32 max-w-5xl">
        <section className="mb-8 animate-fade-in bg-transparent">
          <div className="flex items-center gap-3 md:gap-4">
            <BackButton href={`/profile/${id}`} label="Back to profile" />
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight whitespace-nowrap">QR Code</h1>
          </div>
          <p className="text-muted-foreground mt-2 italic bg-transparent">
            For plaques, headstones and digital spaces alike
          </p>
        </section>

        {isFreeMemorial && isGuardian ? (
          <div className="glass-card flex flex-col items-center justify-center gap-4 py-20 text-center animate-fade-in">
            <div className="relative">
              <QrCode className="h-12 w-12 text-muted-foreground" />
              <div className="absolute -bottom-1 -right-1 rounded-full bg-background/90 p-1 ring-1 ring-border/60">
                <Lock className="h-4 w-4 text-primary" />
              </div>
            </div>
            <h2 className="text-xl font-semibold tracking-tight mt-2">Unlock your QR-Code</h2>
            <p className="text-muted-foreground max-w-md text-sm">
              This memorial is on the free plan. Purchase a QR-Code to print it on plaques, headstones and digital spaces — keep their memory anywhere, scannable forever.
            </p>
            <Button asChild className="mt-2 gap-2">
              <Link href="/billing/qr-code">Purchase QR-Code</Link>
            </Button>
          </div>
        ) : isFreeMemorial ? (
          <div className="glass-card no-sheen flex flex-col items-center justify-center gap-3 py-20 text-center animate-fade-in">
            <QrCode className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">No QR-Code yet.</p>
          </div>
        ) : (
          <QrCodeClient profileUrl={profileUrl} />
        )}
      </main>
    </div>
  )
}
