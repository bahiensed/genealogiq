'use client'

import { Download } from 'lucide-react'
import { Button } from '@genealogiq/ui/button'
import { formatGenCode } from '@/lib/gen-code'
import type { LicenseRow } from '@/queries/licenses'

interface LicensesCsvButtonProps {
  licenses: LicenseRow[]
  appUrl:   string
}

export function LicensesCsvButton({ licenses, appUrl }: LicensesCsvButtonProps) {
  function download() {
    const header = 'code,url,status,activated_at\n'
    const rows = licenses
      .map((l) => {
        const code = formatGenCode(l.genCode)
        const url  = `${appUrl}/qr/${l.genCode}`
        return `${code},${url},${l.status},${l.activatedAt?.toISOString() ?? ''}`
      })
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `qr-licenses-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <Button variant="outline" onClick={download} className="gap-2">
      <Download className="h-4 w-4" />
      Export CSV
    </Button>
  )
}
