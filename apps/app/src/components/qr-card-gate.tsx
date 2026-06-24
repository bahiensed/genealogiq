"use client"

import type { CSSProperties, ReactNode } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
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
  const t = useTranslations("Subscriptions")
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
          <AlertDialogTitle>{t("qrGate.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("qrGate.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("qrGate.maybeLater")}</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Link href="/billing/qr-code">{t("qrGate.purchase")}</Link>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
