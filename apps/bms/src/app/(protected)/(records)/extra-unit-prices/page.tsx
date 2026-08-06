import { getTranslations } from 'next-intl/server'
import { getExtraUnitPrices } from '@/queries/extra-unit-prices'
import { ExtraUnitPriceCard } from '@/components/extra-unit-prices/extra-unit-price-card'

export default async function ExtraUnitPricesPage() {
  const [t, rows] = await Promise.all([
    getTranslations('ExtraUnitPrices'),
    getExtraUnitPrices(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          {t('title')}
        </h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {rows.map((row) => (
          <ExtraUnitPriceCard
            key={row.id}
            row={row}
            title={`${t(`resource.${row.resource}`)} — ${t(`tier.${row.tier}`)}`}
          />
        ))}
      </div>
    </div>
  )
}
