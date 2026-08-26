import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { getPartnerPlan } from '@/queries/partner-plans'
import { PartnerPlanForm, type StripePriceState } from '@/components/partner-plans/partner-plan-form'
import type { PartnerPlanFormValues } from '@/schemas/partner-plan.schema'

interface Props { params: Promise<{ id: string }> }

// Flattens the price book into the form's per-currency fields. The form edits
// one row per currency; the book stores versions, and reconciling the two is
// updatePartnerPlan's job, not the form's.
function toFormValues(plan: NonNullable<Awaited<ReturnType<typeof getPartnerPlan>>>): PartnerPlanFormValues {
  const by = (code: string) => plan.prices.find((p) => p.currency === code)
  const usd = by('USD'), brl = by('BRL'), mxn = by('MXN')

  return {
    name: plan.name,
    code: plan.code,
    description: plan.description ?? '',
    annualAllowance: plan.annualAllowance,
    rolloverRate: plan.rolloverRate,
    rolloverValidityMonths: plan.rolloverValidityMonths,
    graceDays: plan.graceDays,
    committedReservationMonths: plan.committedReservationMonths,
    activationTrialMonths: plan.activationTrialMonths,
    activationTrialPlanCode: plan.activationTrialPlanCode ?? '',
    cashUsd: usd?.annualCashAmount ?? 0,
    installmentUsd: usd?.installmentAmount ?? 0,
    unitRefUsd: usd?.unitReferenceAmount ?? 0,
    cashBrl: brl?.annualCashAmount ?? 0,
    installmentBrl: brl?.installmentAmount ?? 0,
    unitRefBrl: brl?.unitReferenceAmount ?? 0,
    cashMxn: mxn?.annualCashAmount ?? 0,
    installmentMxn: mxn?.installmentAmount ?? 0,
    unitRefMxn: mxn?.unitReferenceAmount ?? 0,
    // One count for the whole plan: the spec's 12x is a plan-level decision, not
    // a per-currency one, and the seeded book uses 12 everywhere.
    installmentCount: usd?.installmentCount ?? brl?.installmentCount ?? mxn?.installmentCount ?? 12,
    isActive: plan.isActive,
  }
}

export default async function PartnerPlanPage({ params }: Props) {
  const { id } = await params
  await verifySession()

  const plan = await getPartnerPlan(id)
  if (!plan) notFound()

  const prices: StripePriceState[] = plan.prices.map((p) => ({
    currency: p.currency,
    cash: p.stripeCashPriceId,
    installment: p.stripeInstallmentPriceId,
    version: p.version,
  }))

  return (
    <PartnerPlanForm
      id={plan.id}
      defaultValues={toFormValues(plan)}
      stripeProductId={plan.prices.find((p) => p.stripeProductId)?.stripeProductId ?? null}
      prices={prices}
    />
  )
}
