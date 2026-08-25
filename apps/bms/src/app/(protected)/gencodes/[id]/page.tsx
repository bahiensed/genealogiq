import { notFound } from 'next/navigation'
import { getPackage } from '@/queries/packages'
import { PackageForm } from '@/components/packages/package-form'
import { FormShell } from '@genealogiq/ui/form-shell'

export default async function EditGenCodeProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const pkg = await getPackage(id)
  if (!pkg) notFound()

  return (
    <FormShell>
      <PackageForm
      id={id}
      defaultValues={{
        name:        pkg.name,
        quantity:    pkg.quantity,
        description: pkg.description ?? '',
        termLength:      pkg.termLength,
        priceUsd:        Number(pkg.priceUsd ?? 0),
        monthlyPriceUsd: Number(pkg.monthlyPriceUsd ?? 0),
        priceBrl:        Number(pkg.priceBrl ?? 0),
        monthlyPriceBrl: Number(pkg.monthlyPriceBrl ?? 0),
        priceMxn:        Number(pkg.priceMxn ?? 0),
        monthlyPriceMxn: Number(pkg.monthlyPriceMxn ?? 0),
        isActive:    pkg.isActive,
      }}
      stripeProductId={pkg.stripeProductId}
      stripePriceIds={{
        usd: { annual: pkg.stripeAnnualPriceIdUsd, monthly: pkg.stripeMonthlyPriceIdUsd },
        brl: { annual: pkg.stripeAnnualPriceIdBrl, monthly: pkg.stripeMonthlyPriceIdBrl },
        mxn: { annual: pkg.stripeAnnualPriceIdMxn, monthly: pkg.stripeMonthlyPriceIdMxn },
      }}
      />
    </FormShell>
  )
}
