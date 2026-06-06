'use client'

import { useTransition } from 'react'
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

const STATUS_BADGE: Record<string, { label: string; variant: 'secondary' | 'default' | 'outline' }> = {
  PENDING:   { label: 'Pending',   variant: 'secondary' },
  PRINTED:   { label: 'Printed',   variant: 'default'   },
  INSTALLED: { label: 'Installed', variant: 'outline'   },
}

export function QrStatusCard({ appUserId, qrCode }: { appUserId: string; qrCode: QrCodeData }) {
  const [isPending, startTransition] = useTransition()

  const badge = STATUS_BADGE[qrCode.status] ?? STATUS_BADGE.PENDING

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
          QR Code Status
          <Badge variant={badge.variant} className="ml-auto">{badge.label}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground break-all">{qrCode.url}</p>

        {qrCode.printedAt && (
          <p className="text-xs text-muted-foreground">
            Printed: {new Date(qrCode.printedAt).toLocaleDateString()}
          </p>
        )}
        {qrCode.installedAt && (
          <p className="text-xs text-muted-foreground">
            Installed: {new Date(qrCode.installedAt).toLocaleDateString()}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {qrCode.scanCount > 0
            ? `${qrCode.scanCount} scan${qrCode.scanCount === 1 ? '' : 's'} — last: ${new Date(qrCode.lastScannedAt!).toLocaleDateString()}`
            : 'No scans yet'
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
              Mark as printed
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
              Mark as installed
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
