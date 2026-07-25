import { getTranslations } from "next-intl/server"
import Link from "next/link"
import { FilePlus } from "lucide-react"
import { auth } from "@/auth"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { Button } from "@/components/ui/button"
import { DocumentsClient } from "@/components/documents-client"
import { SignupPrompt } from "@/components/auth/signup-prompt"
import { getDocumentsByUserId, getDocumentsCount, ANON_DOCUMENTS_LIMIT } from "@/queries/documents"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { assertPublicMemorialAccess } from "@/lib/public-profile-access"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProfileDocumentsPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  const viewerId = session?.user?.id
  const isAnon = !viewerId
  const t = await getTranslations("Documents")

  const profile = await getProfileById(id)
  assertPublicMemorialAccess(profile, viewerId, id)

  const isOwn = viewerId ? canManageProfile(profile, viewerId) : false

  // Anonymous: a bounded slice of documents + a cheap total count for the badge /
  // wall trigger. Authed: the full set the caller is entitled to (owner sees
  // public + private; anyone else sees public only via includePrivate=isOwn).
  const documents = await getDocumentsByUserId(id, {
    includePrivate: isOwn,
    take: isAnon ? ANON_DOCUMENTS_LIMIT : undefined,
  })
  const count = isAnon ? await getDocumentsCount(id, isOwn) : documents.length

  return (
    <div className="relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32">
        <div className="flex items-center justify-between gap-3 mb-2 animate-fade-in">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <BackButton href={`/profile/${id}`} label={t("backToProfile")} />
            <div className="min-w-0">
              <h1 className="text-4xl font-semibold tracking-tight whitespace-nowrap">{t("title", { name: profile.firstName })}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {count > 0 && (
              <span className="hidden sm:inline-flex items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-0.5">
                {t("count", { count })}
              </span>
            )}
            {isOwn && (
              <Button asChild size="sm" className="gap-1.5">
                <Link href={`/profile/${id}/documents/new`}>
                  <FilePlus className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("addDocument")}</span>
                </Link>
              </Button>
            )}
          </div>
        </div>
        <p className="text-muted-foreground italic mb-8 animate-fade-in">{t("tagline")}</p>

        <DocumentsClient documents={documents} profileId={id} isOwn={isOwn} gated={isAnon} hasMore={count > ANON_DOCUMENTS_LIMIT} />
      </main>

      {isAnon && <SignupPrompt />}
    </div>
  )
}
