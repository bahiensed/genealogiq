import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ArrowLeft } from 'lucide-react'
import { getLicenseByGenCode } from '@/queries/licenses'
import { QrCodePresets } from '@/components/memorialized/qr-code-presets'
import { GenCodeActions } from '@/components/gencode/gencode-actions'
import { formatGenCode } from '@/lib/gen-code'

export default async function GenCodeDetailPage({
  params,
}: {
  params: Promise<{ genCode: string }>
}) {
  const { genCode: raw } = await params
  const genCode = raw.toUpperCase().replace(/-/g, '')

  const license = await getLicenseByGenCode(genCode)
  if (!license) notFound()

  const t = await getTranslations('GenCode')

  const appUrl   = process.env.APP_URL ?? 'https://genealogiq.app'
  const qrUrl    = `${appUrl}/qr/${license.genCode}`
  const filename = `qr-${license.genCode.toLowerCase()}`

  const detail = {
    genCode:     license.genCode,
    status:      license.status,
    printedAt:   license.printedAt,
    soldAt:      license.soldAt,
    soldVia:     license.soldVia,
    soldToName:  license.soldToName,
    soldValue:   license.soldValue != null ? Number(license.soldValue) : null,
    activatedAt: license.activatedAt,
    createdAt:   license.createdAt,
    memorial:    license.appUser ? { firstName: license.appUser.firstName, lastName: license.appUser.lastName } : null,
    buyer:       license.soldToAppUser
      ? { firstName: license.soldToAppUser.firstName, lastName: license.soldToAppUser.lastName, email: license.soldToAppUser.email ?? '' }
      : null,
    soldByName:  license.soldBy ? `${license.soldBy.firstName} ${license.soldBy.lastName}` : null,
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/inventory/gencodes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit">
          <ArrowLeft className="h-4 w-4" /> {t('detail.backToInventory')}
        </Link>
        <h1 className="scroll-m-20 text-4xl font-semibold tracking-tight text-balance">
          {t('detail.title')}
        </h1>
        <p className="font-mono text-sm tracking-wider text-muted-foreground">{formatGenCode(license.genCode)}</p>
        <p className="font-mono text-xs text-muted-foreground break-all">{qrUrl}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* QR model possibilities for this code */}
        <div className="lg:col-span-2">
          <QrCodePresets profileUrl={qrUrl} filename={filename} />
        </div>

        {/* Status + sale/print actions */}
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-20">
            <GenCodeActions license={detail} />
          </div>
        </aside>
      </div>
    </div>
  )
}
