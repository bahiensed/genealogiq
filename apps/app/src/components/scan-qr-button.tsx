'use client'

import { useState } from "react"
import { QrCode } from "lucide-react"
import { GlassIcon } from "@/components/glass-icon"
import { QrScannerModal } from "@/components/qr-scanner-modal"

export function ScanQrButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="glass-card flex lg:w-auto w-full items-center justify-center gap-3 px-5 py-3 group"
        aria-label="Scan QR code"
      >
        <GlassIcon icon={QrCode} size="sm" />
        <span className="lg:hidden font-medium">Scan a QR code</span>
        <span className="hidden lg:inline text-sm font-medium pr-2">Scan QR</span>
      </button>

      {open && <QrScannerModal onClose={() => setOpen(false)} />}
    </>
  )
}
