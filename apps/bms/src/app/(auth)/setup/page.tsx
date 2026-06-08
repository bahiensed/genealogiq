import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { SetupWizard } from '@/components/auth/setup-wizard'

// Queries the DB (user count) with no dynamic request API, so Next would
// otherwise prerender it at build time and hit the database during `next build`.
export const dynamic = 'force-dynamic'

export default async function SetupPage() {
  const count = await prisma.user.count()
  if (count > 0) redirect('/sign-in')

  return <SetupWizard />
}
