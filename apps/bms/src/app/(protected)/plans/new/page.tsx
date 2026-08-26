import { verifySession } from '@/lib/dal'
import { NewPlanForm } from '@/components/partner-plans/new-plan-form'

export default async function NewPartnerPlanPage() {
  await verifySession()
  return <NewPlanForm />
}
