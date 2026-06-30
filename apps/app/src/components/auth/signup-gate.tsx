"use client"

import type { CSSProperties, ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { Lock } from "lucide-react"
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

// Action gate for sections fully locked to anonymous visitors (family tree,
// geolocation). Wraps the bento card so a click opens a sign-up dialog instead of
// navigating. Mirrors QrCardGate's shape; returns the visitor to the current page
// after auth. Used via the bento `gated` mode with `gate: "signup"`.
export function SignupGate({ className, style, children }: Props) {
  const t = useTranslations("Auth")
  const pathname = usePathname()
  const callback = encodeURIComponent(pathname || "/")

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
            <Lock className="text-primary" />
          </AlertDialogMedia>
          <AlertDialogTitle>{t("signupGateTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("signupGateDescription")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("notNow")}</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Link href={`/sign-up?callbackUrl=${callback}`}>{t("createAccount")}</Link>
          </AlertDialogAction>
        </AlertDialogFooter>
        <p className="text-center text-xs text-muted-foreground">
          {t("alreadyHaveAccount")}{" "}
          <Link href={`/sign-in?callbackUrl=${callback}`} className="text-primary hover:underline font-medium">
            {t("signIn")}
          </Link>
        </p>
      </AlertDialogContent>
    </AlertDialog>
  )
}
