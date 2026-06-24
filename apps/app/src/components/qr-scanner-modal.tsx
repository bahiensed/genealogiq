'use client'

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Html5Qrcode } from "html5-qrcode"
import { X, QrCode } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

const SCANNER_ELEMENT_ID = "qr-scanner-region"

interface Props {
  onClose: () => void
}

export function QrScannerModal({ onClose }: Props) {
  const router = useRouter()
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [hasPermission, setHasPermission] = useState<"pending" | "granted" | "denied">("pending")

  useEffect(() => {
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
            if (!profileMatch) { toast.error("QR code does not point to a valid profile."); onClose(); return }
            router.push(url.pathname)
            onClose()
          } catch {
            toast.error("Invalid QR code.")
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
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.toLowerCase().includes("permission")) {
          setHasPermission("denied")
        } else {
          toast.error("Could not start camera.")
          onClose()
        }
      })

    return () => {
      unmounted = true
      stopSafely()
    }
  }, [router, onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-label="QR code scanner"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          <span className="font-semibold">Scan a QR code</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close scanner">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
        {hasPermission === "denied" ? (
          <div className="text-center space-y-3 max-w-xs">
            <QrCode className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="font-medium">Camera access denied</p>
            <p className="text-sm text-muted-foreground">
              Allow camera access in your browser settings and try again.
            </p>
            <Button onClick={onClose}>Close</Button>
          </div>
        ) : (
          <>
            <div className="relative w-full max-w-xs aspect-square rounded-2xl overflow-hidden border-2 border-primary/40">
              <div id={SCANNER_ELEMENT_ID} className="h-full w-full" />
              {hasPermission === "pending" && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                  <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              )}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute top-3 left-3 h-8 w-8 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                <div className="absolute top-3 right-3 h-8 w-8 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                <div className="absolute bottom-3 left-3 h-8 w-8 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                <div className="absolute bottom-3 right-3 h-8 w-8 border-b-2 border-r-2 border-primary rounded-br-lg" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Point the camera at a Genealogiq QR code
            </p>
          </>
        )}
      </div>
    </div>
  )
}
