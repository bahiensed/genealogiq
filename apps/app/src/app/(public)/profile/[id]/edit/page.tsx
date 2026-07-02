import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Button } from "@/components/ui/button"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { MemorialEditForm } from "@/components/memorial-edit-form"
import { verifySession } from "@/lib/dal"
import { getProfileForEdit } from "@/queries/profile"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProfileEditPage({ params }: Props) {
  const { id } = await params
  const session = await verifySession()
  const t = await getTranslations("Memorialized")
  const tc = await getTranslations("Common")

  const profile = await getProfileForEdit(id)
  if (!profile) notFound()

  const isOwn = id === session.user.id
  const isGuardian = profile.role === "APP_MEMO" && profile.guardedBy.some((g) => g.guardianId === session.user.id)
  if (!isOwn && !isGuardian) redirect(`/profile/${id}`)

  const isMemorialized = profile.role === "APP_MEMO"

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32">
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 md:gap-4">
            <BackButton href={`/profile/${id}`} label={t("editPage.backToProfile")} />
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight whitespace-nowrap">{t("editPage.title")}</h1>
          </div>
          <div className="mt-2 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 bg-transparent">
            <div className="flex flex-col gap-1 min-w-0 bg-transparent">
              <p className="text-muted-foreground italic bg-transparent">
                {isMemorialized ? t("editPage.subtitleMemorial") : t("editPage.subtitleLiving")}
              </p>
            </div>
            <Button variant="ghost" asChild className="shrink-0 self-end lg:self-auto">
              <Link href={`/profile/${id}`}>{tc("cancel")}</Link>
            </Button>
          </div>
        </div>

        <MemorialEditForm profileId={id} initial={profile} isMemorialized={isMemorialized} />
      </main>
    </div>
  )
}
