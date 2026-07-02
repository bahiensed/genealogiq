import { redirect } from "next/navigation"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Button } from "@/components/ui/button"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { MemorialCreateForm } from "@/components/memorial-create-form"
import { verifySession } from "@/lib/dal"
import { countMemorialsByCreatorId } from "@/queries/memorial"

const MAX_MEMORIALS = 2

interface Props {
  params: Promise<{ id: string }>
}

export default async function MemorialNewPage({ params }: Props) {
  const { id } = await params
  const session = await verifySession()
  const t = await getTranslations("Memorialized")
  const tc = await getTranslations("Common")

  if (id !== session.user.id) redirect(`/profile/${id}/memorialized`)

  const count = await countMemorialsByCreatorId(id)
  if (count >= MAX_MEMORIALS) redirect(`/profile/${id}/memorialized`)

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32">
        <section className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-fade-in">
          <div className="bg-transparent">
            <div className="flex items-center gap-3 md:gap-4">
              <BackButton href={`/profile/${id}/memorialized`} label={t("newPage.backToGuarded")} />
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight whitespace-nowrap">{t("newPage.title")}</h1>
            </div>
            <p className="text-muted-foreground mt-2 bg-transparent">
              {t("newPage.subtitle")}
            </p>
          </div>
          <Button variant="ghost" asChild className="shrink-0">
            <Link href={`/profile/${id}/memorialized`}>{tc("cancel")}</Link>
          </Button>
        </section>

        <MemorialCreateForm />
      </main>
    </div>
  )
}
