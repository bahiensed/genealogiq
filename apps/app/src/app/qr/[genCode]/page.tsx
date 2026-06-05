import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { getLicenseByGenCode } from "@/queries/physical-qr"
import { PhysicalQrLanding } from "@/components/qr/physical-qr-landing"
import { ActivateMemorialForm } from "@/components/qr/activate-memorial-form"
import { AuroraBackdrop } from "@/components/aurora-backdrop"

interface Props {
  params: Promise<{ genCode: string }>
}

export default async function PhysicalQrPage({ params }: Props) {
  const { genCode: rawGenCode } = await params
  const normalized = rawGenCode.toUpperCase().replace(/-/g, "")

  const [session, license] = await Promise.all([
    auth(),
    getLicenseByGenCode(normalized),
  ])

  if (!license) notFound()

  if (license.status === "ACTIVATED") {
    redirect(`/profile/${license.appUserId}`)
  }

  // AVAILABLE
  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />
      <main className="container relative z-10 pt-24 pb-32 max-w-2xl">
        {session?.user ? (
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight">Activate Memorial</h1>
              <p className="text-muted-foreground mt-2">
                Fill in the details of the person you are memorializing.
              </p>
            </div>
            <ActivateMemorialForm genCode={normalized} />
          </div>
        ) : (
          <PhysicalQrLanding genCode={normalized} />
        )}
      </main>
    </div>
  )
}
