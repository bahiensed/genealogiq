'use client'

import { useState } from "react"
import { QrCode } from "lucide-react"
import { useTranslations } from "next-intl"
import { GlassIcon } from "@/components/glass-icon"
import { QrScannerModal } from "@/components/qr-scanner-modal"

export function ScanQrButton() {
  const t = useTranslations("Qr")
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="glass-card flex lg:w-auto w-full items-center justify-center gap-3 px-5 py-3 group"
        aria-label={t("scanButton.aria")}
      >
        <GlassIcon icon={QrCode} size="sm" />
        <span className="lg:hidden font-medium">{t("scanButton.labelLong")}</span>
        <span className="hidden lg:inline text-sm font-medium pr-2">{t("scanButton.labelShort")}</span>
      </button>

      {open && <QrScannerModal onClose={() => setOpen(false)} />}
    </>
  )
}
