import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Button } from "@/components/ui/button"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { BioEditForm } from "@/components/bio-edit-form"
import { verifySession } from "@/lib/dal"
import { getBioByUserId } from "@/queries/bio"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { getMemorialFeatures } from "@/lib/subscription"
import { UpgradeHint } from "@/components/upgrade-hint"

interface Props {
  params: Promise<{ id: string }>
}

export default async function BioEditPage({ params }: Props) {
  const { id } = await params
  const session = await verifySession()
  const t = await getTranslations("Bio")
  const tc = await getTranslations("Common")

  const [profile, bio, features] = await Promise.all([
    getProfileById(id),
    getBioByUserId(id),
    getMemorialFeatures(id),
  ])
  if (!profile) notFound()

  if (!canManageProfile(profile, session.user.id)) redirect(`/profile/${id}/bio`)

  const isCreating = !bio
  const textLen = bio?.text?.length ?? 0
  const imageCount = bio?.images.length ?? 0
  const atLimit = textLen >= features.bioMaxChars || imageCount >= features.bioMaxImages

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32">
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 md:gap-4">
            <BackButton href={`/profile/${id}/bio`} label={t("backToBiography")} />
            <h1 className="text-4xl font-semibold tracking-tight whitespace-nowrap">
              {isCreating ? t("editTitleCreate") : t("editTitleEdit")}
            </h1>
          </div>
          <div className="mt-2 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 bg-transparent">
            <div className="flex flex-col gap-1 min-w-0 bg-transparent">
              <p className="text-muted-foreground italic bg-transparent">
                {isCreating ? t("editSubtitleCreate") : t("editSubtitleEdit")}
              </p>
              {atLimit && <UpgradeHint context="bio" currentTier={features.code} />}
            </div>
            <Button variant="ghost" asChild className="shrink-0 self-end lg:self-auto">
              <Link href={`/profile/${id}/bio`}>{tc("cancel")}</Link>
            </Button>
          </div>
        </div>

        <BioEditForm
          initial={bio}
          profileId={id}
          maxChars={features.bioMaxChars}
          maxImages={features.bioMaxImages}
        />
      </main>
    </div>
  )
}
