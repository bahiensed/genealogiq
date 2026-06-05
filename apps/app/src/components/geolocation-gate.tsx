"use client"

import type { CSSProperties, ReactNode } from "react"
import Link from "next/link"
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
          <AlertDialogTitle>Unlock precise coordinates</AlertDialogTitle>
          <AlertDialogDescription>
            Drop a pin at exact GPS coordinates so visitors can navigate straight to the place. Available on Década and Século plans.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Maybe later</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Link href="/billing/qr-code">Upgrade plan</Link>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
