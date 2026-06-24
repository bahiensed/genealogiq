'use client'

import { useTransition } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@genealogiq/ui/card'
import { Badge } from '@genealogiq/ui/badge'
import { Button } from '@genealogiq/ui/button'
import { Printer, MapPin, QrCode } from 'lucide-react'
import { markQrPrinted, markQrInstalled } from '@/actions/qr-code.actions'

type QrCodeData = {
  id:            string
  url:           string
  status:        string
  printedAt:     Date | null
  installedAt:   Date | null
  scanCount:     number
  lastScannedAt: Date | null
}

const STATUS_VARIANT: Record<string, 'secondary' | 'default' | 'outline'> = {
  PENDING:   'secondary',
  PRINTED:   'default',
  INSTALLED: 'outline',
}

const STATUS_KEY: Record<string, string> = {
  PENDING:   'pending',
  PRINTED:   'printed',
  INSTALLED: 'installed',
}

export function QrStatusCard({ appUserId, qrCode }: { appUserId: string; qrCode: QrCodeData }) {
  const t = useTranslations('Memorialized')
  const locale = useLocale()
  const [isPending, startTransition] = useTransition()

  const variant = STATUS_VARIANT[qrCode.status] ?? STATUS_VARIANT.PENDING
  const statusKey = STATUS_KEY[qrCode.status] ?? STATUS_KEY.PENDING
  const formatDate = (d: Date) => new Date(d).toLocaleDateString(locale)

  function handlePrinted() {
    startTransition(async () => { await markQrPrinted(appUserId) })
  }

  function handleInstalled() {
    startTransition(async () => { await markQrInstalled(appUserId) })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <QrCode className="h-4 w-4" />
          {t('qr.statusTitle')}
          <Badge variant={variant} className="ml-auto">{t(`status.${statusKey}`)}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground break-all">{qrCode.url}</p>

        {qrCode.printedAt && (
          <p className="text-xs text-muted-foreground">
            {t('qr.printedOn', { date: formatDate(qrCode.printedAt) })}
          </p>
        )}
        {qrCode.installedAt && (
          <p className="text-xs text-muted-foreground">
            {t('qr.installedOn', { date: formatDate(qrCode.installedAt) })}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {qrCode.scanCount > 0
            ? t('qr.scans', { count: qrCode.scanCount, date: formatDate(qrCode.lastScannedAt!) })
            : t('qr.noScans')
          }
        </p>

        <div className="flex flex-col gap-2 pt-1">
          {qrCode.status === 'PENDING' && (
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={handlePrinted}
              className="w-full"
            >
              <Printer className="h-4 w-4 mr-2" />
              {t('qr.markPrinted')}
            </Button>
          )}
          {qrCode.status === 'PRINTED' && (
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={handleInstalled}
              className="w-full"
            >
              <MapPin className="h-4 w-4 mr-2" />
              {t('qr.markInstalled')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
