"use client"

import type { CSSProperties, ReactNode } from "react"
import Link from "next/link"
import { QrCode } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Props {
  className: string
  style?: CSSProperties
  children: ReactNode
}

export function QrCardGate({ className, style, children }: Props) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button type="button" className={className} style={style}>
          {children}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <QrCode className="text-primary" />
          </AlertDialogMedia>
          <AlertDialogTitle>Unlock your QR-Code</AlertDialogTitle>
          <AlertDialogDescription>
            This memorial is on the free plan. Purchase a QR-Code to print it on plaques, headstones and digital spaces — keep their memory anywhere, scannable forever.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Maybe later</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Link href="/billing/qr-code">Purchase QR-Code</Link>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
