import { redirect } from "next/navigation"
import Link from "next/link"
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

  if (id !== session.user.id) redirect(`/profile/${id}/memorialized`)

  const count = await countMemorialsByCreatorId(id)
  if (count >= MAX_MEMORIALS) redirect(`/profile/${id}/memorialized`)

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32 max-w-4xl">
        <section className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-fade-in">
          <div className="bg-transparent">
            <div className="flex items-center gap-3 md:gap-4">
              <BackButton href={`/profile/${id}/memorialized`} label="Back to guarded profiles" />
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight whitespace-nowrap">New memorialized profile</h1>
            </div>
            <p className="text-muted-foreground mt-2 bg-transparent">
              Create a memorial for someone who lives on in your memory.
            </p>
          </div>
          <Button variant="ghost" asChild className="shrink-0">
            <Link href={`/profile/${id}/memorialized`}>Cancel</Link>
          </Button>
        </section>

        <MemorialCreateForm />
      </main>
    </div>
  )
}
