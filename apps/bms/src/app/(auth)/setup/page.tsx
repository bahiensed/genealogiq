import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { SetupWizard } from '@/components/auth/setup-wizard'

export default async function SetupPage() {
  const count = await prisma.user.count()
  if (count > 0) redirect('/sign-in')

  return <SetupWizard />
}
