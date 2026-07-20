'use client'

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Html5Qrcode } from "html5-qrcode"
import { QrCode } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const SCANNER_ELEMENT_ID = "qr-scanner-region"

// The browser reports a blocked camera through the DOMException name, which is
// stable across locales — the message string is not. html5-qrcode sometimes
// rejects with a bare string instead of an Error, so the message is kept as a
// last-resort fallback for those cases.
function isPermissionDenied(err: unknown): boolean {
  if (err instanceof DOMException) {
    return err.name === "NotAllowedError" || err.name === "SecurityError"
  }
  const name = typeof err === "object" && err !== null && "name" in err ? String(err.name) : ""
  if (name === "NotAllowedError" || name === "SecurityError") return true
  const msg = err instanceof Error ? err.message : String(err)
  return msg.toLowerCase().includes("permission")
}

interface Props {
  onClose: () => void
}

export function QrScannerModal({ onClose }: Props) {
  const t = useTranslations("Qr")
  const tc = useTranslations("Common")
  const router = useRouter()
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [hasPermission, setHasPermission] = useState<"pending" | "granted" | "denied">("pending")

  // Radix mounts DialogContent through Presence, one state cycle after this
  // component commits — so the scan region does not exist yet when our effect
  // first runs, and html5-qrcode resolves it by id. This callback ref tells us
  // when the node is actually in the DOM.
  const [regionReady, setRegionReady] = useState(false)
  const regionRef = useCallback((node: HTMLDivElement | null) => {
    setRegionReady(node !== null)
  }, [])

  useEffect(() => {
    if (!regionReady) return

    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, { verbose: false })
    scannerRef.current = scanner
    let started = false
    let unmounted = false

    const stopSafely = () => {
      if (!started) return
      // stop() rejects when the camera never started — an expected, benign race, not a swallowed error.
      try { scanner.stop().catch(() => { /* expected when not running */ }) } catch { /* not running */ }
    }

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          stopSafely()
          try {
            const url = new URL(decodedText)
            const profileMatch = url.pathname.match(/^\/profile\/([^/]+)$/)
            if (!profileMatch) { toast.error(t("scanner.notValidProfile")); onClose(); return }
            router.push(url.pathname)
            onClose()
          } catch {
            toast.error(t("scanner.invalidCode"))
            onClose()
          }
        },
        () => {
          // per-frame failures are normal while no QR is in frame — ignore
        },
      )
      .then(() => {
        started = true
        if (unmounted) stopSafely()
        else setHasPermission("granted")
      })
      .catch((err: unknown) => {
        if (isPermissionDenied(err)) {
          setHasPermission("denied")
        } else {
          toast.error(t("scanner.cameraStartFailed"))
          onClose()
        }
      })

    return () => {
      unmounted = true
      stopSafely()
    }
  }, [router, onClose, t, regionReady])

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            {t("scanner.title")}
          </DialogTitle>
          <DialogDescription>
            {hasPermission === "denied" ? t("scanner.permissionDeniedHint") : t("scanner.pointCamera")}
          </DialogDescription>
        </DialogHeader>

        {/* The scanner region must stay mounted in every state: html5-qrcode
            resolves it by id when the effect runs, before permission is known. */}
        <div className={hasPermission === "denied" ? "hidden" : "flex flex-col items-center gap-4"}>
          <div className="relative w-full max-w-xs aspect-square rounded-2xl overflow-hidden border-2 border-primary/40 bg-black">
            {/* html5-qrcode injects a <video> at the camera's native ratio, which
                is shorter than this square frame — centring it keeps the whole
                picture and splits the leftover space evenly instead of pooling
                it at the bottom. */}
            <div
              id={SCANNER_ELEMENT_ID}
              ref={regionRef}
              className="flex h-full w-full items-center justify-center"
            />
            {hasPermission === "pending" && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            )}
          </div>
        </div>

        {hasPermission === "denied" && (
          <div className="flex flex-col items-center gap-3 text-center">
            <QrCode className="h-12 w-12 text-muted-foreground" />
            {/* The hint itself is carried by DialogDescription above. */}
            <p className="font-medium">{t("scanner.permissionDeniedTitle")}</p>
            <Button onClick={onClose}>{tc("close")}</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
