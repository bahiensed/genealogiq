import { getTranslations } from "next-intl/server"
import { FilePlus } from "lucide-react"
import { auth } from "@/auth"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { QuotaGatedLink } from "@/components/quota-gated-link"
import { DocumentsClient } from "@/components/documents-client"
import { SignupPrompt } from "@/components/auth/signup-prompt"
import { getDocumentsByUserId, getDocumentsCount, ANON_DOCUMENTS_LIMIT } from "@/queries/documents"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { getMemorialFeatures } from "@/lib/subscription"
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
  const [documents, features] = await Promise.all([
    getDocumentsByUserId(id, {
      includePrivate: isOwn,
      take: isAnon ? ANON_DOCUMENTS_LIMIT : undefined,
    }),
    getMemorialFeatures(id),
  ])
  const count = isAnon ? await getDocumentsCount(id, isOwn) : documents.length
  const atLimit = count >= features.documentsMax

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
              <QuotaGatedLink
                href={`/profile/${id}/documents/new`}
                atLimit={atLimit}
                limitContext="documents"
                limit={features.documentsMax}
                tier={features.code}
                size="sm"
                className="gap-1.5"
              >
                <FilePlus className="h-4 w-4" />
                <span className="hidden sm:inline">{t("addDocument")}</span>
              </QuotaGatedLink>
            )}
          </div>
        </div>
        <p className="text-muted-foreground italic mb-8 animate-fade-in">{t("tagline")}</p>

        <DocumentsClient
          documents={documents}
          profileId={id}
          isOwn={isOwn}
          gated={isAnon}
          hasMore={count > ANON_DOCUMENTS_LIMIT}
          atLimit={atLimit}
          documentsMax={features.documentsMax}
          tier={features.code}
        />
      </main>

      {isAnon && <SignupPrompt />}
    </div>
  )
}
