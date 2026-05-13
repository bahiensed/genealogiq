import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { TributeForm } from "@/components/tribute-form"
import { verifySession } from "@/lib/dal"
import { getMyTributeForProfile } from "@/queries/tribute"
import { getProfileById } from "@/queries/profile"

interface Props {
  params: Promise<{ id: string }>
}

export default async function TributeWritePage({ params }: Props) {
  const { id } = await params
  const session = await verifySession()

  if (id === session.user.id) redirect(`/profile/${id}/tributes`)

  const [profile, existing] = await Promise.all([
    getProfileById(id),
    getMyTributeForProfile(session.user.id, id),
  ])
  if (!profile) notFound()

  const isEditing = !!existing
  const authorName = session.user.name ?? "You"

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32 max-w-3xl">
        <section className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-fade-in">
          <div className="bg-transparent">
            <div className="flex items-center gap-3 md:gap-4">
              <BackButton href={`/profile/${id}/tributes`} label="Back to tributes" />
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight whitespace-nowrap">
                {isEditing ? "Edit your tribute" : "Send a tribute"}
              </h1>
            </div>
            <p className="text-muted-foreground mt-2 bg-transparent">Share a memory or message</p>
          </div>
          <Button variant="ghost" asChild className="shrink-0">
            <Link href={`/profile/${id}/tributes`}>Cancel</Link>
          </Button>
        </section>

        <TributeForm
          profileId={id}
          authorName={authorName}
          existing={existing ? { text: existing.text, imageUrl: existing.imageUrl } : null}
        />
      </main>
    </div>
  )
}
