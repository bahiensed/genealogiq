"use client"

import { useEffect, useState } from "react"
import { QrCode, Download, Copy } from "lucide-react"
import QRCode from "qrcode"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

interface Props {
  profileId: string
  placeId: string
}

// Generates a QR (client-side) that resolves to this profile's geolocation
// collection, pre-focused on this place. All per-place QRs open the collection.
export function PlaceQrButton({ profileId, placeId }: Props) {
  const t = useTranslations("Places")
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState("")
  const [svg, setSvg] = useState("")

  useEffect(() => {
    if (!open) return
    const target = `${window.location.origin}/profile/${profileId}/places?place=${placeId}`
    setUrl(target)
    let active = true
    QRCode.toString(target, {
      type: "svg",
      errorCorrectionLevel: "H",
      margin: 2,
      color: { dark: "#0F172A", light: "#FFFFFF" },
    }).then((s) => { if (active) setSvg(s) })
    return () => { active = false }
  }, [open, profileId, placeId])

  const handlePng = async () => {
    const dataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 1024,
      color: { dark: "#0F172A", light: "#FFFFFF" },
    })
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    downloadBlob(blob, `place-qr-${placeId}.png`)
    toast.success(t("qrPngDownloaded"))
  }

  const handleSvg = () => {
    const blob = new Blob([svg], { type: "image/svg+xml" })
    downloadBlob(blob, `place-qr-${placeId}.svg`)
    toast.success(t("qrSvgDownloaded"))
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url)
    toast.success(t("qrLinkCopied"))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <QrCode className="h-4 w-4" />
          {t("qrButton")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("qrTitle")}</DialogTitle>
          <DialogDescription>{t("qrDescription")}</DialogDescription>
        </DialogHeader>
        <div
          className="rounded-xl overflow-hidden flex items-center justify-center aspect-square p-6 bg-white"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="flex gap-2">
          <Button onClick={handlePng} variant="outline" size="sm" className="flex-1 gap-1.5">
            <Download className="h-4 w-4" />PNG
          </Button>
          <Button onClick={handleSvg} variant="outline" size="sm" className="flex-1 gap-1.5">
            <Download className="h-4 w-4" />SVG
          </Button>
          <Button onClick={handleCopy} variant="ghost" size="sm" className="gap-1.5">
            <Copy className="h-4 w-4" />{t("qrCopyLink")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
