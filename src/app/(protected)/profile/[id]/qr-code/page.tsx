import { notFound } from "next/navigation"
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
  await verifySession()

  const profile = await getProfileById(id)
  if (!profile) notFound()

  const appUrl = process.env.APP_URL ?? "https://genealogiq.app"
  const profileUrl = `${appUrl}/profile/${id}`

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32 max-w-5xl">
        <section className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 md:gap-4">
            <BackButton href={`/profile/${id}`} label="Back to profile" />
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">QR Code</h1>
          </div>
          <p className="text-muted-foreground mt-2 italic">
            For plaques, headstones and digital spaces alike.
          </p>
        </section>

        <QrCodeClient profileUrl={profileUrl} />
      </main>
    </div>
  )
}
