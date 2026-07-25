import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Button } from "@/components/ui/button"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { DocumentEditForm } from "@/components/document-edit-form"
import { verifySession } from "@/lib/dal"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"

interface Props {
  params: Promise<{ id: string }>
}

export default async function NewDocumentPage({ params }: Props) {
  const { id } = await params
  const session = await verifySession()
  const [t, tc] = await Promise.all([getTranslations("Documents"), getTranslations("Common")])

  const profile = await getProfileById(id)
  if (!profile) notFound()
  if (!canManageProfile(profile, session.user.id)) redirect(`/profile/${id}/documents`)

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32">
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 md:gap-4">
            <BackButton href={`/profile/${id}/documents`} label={t("backToDocuments")} />
            <h1 className="text-4xl font-semibold tracking-tight whitespace-nowrap">{t("newTitle")}</h1>
          </div>
          <div className="mt-2 flex items-start justify-between gap-3">
            <p className="text-muted-foreground italic">{t("editSubtitle")}</p>
            <Button variant="ghost" asChild className="shrink-0">
              <Link href={`/profile/${id}/documents`}>{tc("cancel")}</Link>
            </Button>
          </div>
        </div>

        <DocumentEditForm profileId={id} existing={null} />
      </main>
    </div>
  )
}
