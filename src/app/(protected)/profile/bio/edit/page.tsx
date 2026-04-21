import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { BioEditForm } from "@/components/bio-edit-form"
import { verifySession } from "@/lib/dal"
import { getBioByUserId } from "@/queries/bio"

export default async function BioEditPage() {
  const session = await verifySession()
  const bio = await getBioByUserId(session.user.id)
  const isCreating = !bio

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32 max-w-4xl">
        <section className="mb-8 flex items-end justify-between gap-4 animate-fade-in">
          <div>
            <div className="flex items-center gap-3 md:gap-4">
              <BackButton href="/profile/bio" label="Back to biography" />
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
                {isCreating ? "Create Biography" : "Edit Biography"}
              </h1>
            </div>
            <p className="text-muted-foreground mt-2">
              {isCreating ? "Add photos, a quote and the life story." : "Update photos, quote and life story."}
            </p>
          </div>
          <Button variant="ghost" asChild className="shrink-0">
            <Link href="/profile/bio">Cancel</Link>
          </Button>
        </section>

        <BioEditForm initial={bio} />
      </main>
    </div>
  )
}
