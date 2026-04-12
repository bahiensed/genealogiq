'use client'

import { useRef, useCallback } from 'react'
import QRCode from 'react-qr-code'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QrCodeDownloadProps {
  value: string
  filename: string
  previewSize?: number
}

export function QrCodeDownload({ value, filename, previewSize = 48 }: QrCodeDownloadProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const handleDownload = useCallback(() => {
    const svg = containerRef.current?.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const size = 400
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    const img = new Image()
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, size, size)
        ctx.drawImage(img, 0, 0, size, size)
      }
      URL.revokeObjectURL(url)
      const link = document.createElement('a')
      link.download = `${filename}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = url
  }, [filename])

  return (
    <div className="flex items-center gap-2">
      <div ref={containerRef} className="shrink-0">
        <QRCode value={value} size={previewSize} />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleDownload}
        title="Baixar QR Code"
        className="h-7 w-7"
      >
        <Download className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
