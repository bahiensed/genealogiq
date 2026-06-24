"use client"

import type { CSSProperties, ReactNode } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { MapPin } from "lucide-react"
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
  className?: string
  style?: CSSProperties
  children: ReactNode
}

export function GeolocationGate({ className, style, children }: Props) {
  const t = useTranslations("Geolocation")
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
            <MapPin className="text-primary" />
          </AlertDialogMedia>
          <AlertDialogTitle>{t("gate.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("gate.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("gate.dismiss")}</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Link href="/billing/qr-code">{t("gate.upgrade")}</Link>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
