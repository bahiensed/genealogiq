'use client'

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { useTranslations } from "next-intl"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/language-switcher"

// Header shown to anonymous visitors on public (memorial) pages. Mirrors the
// authenticated Header chrome (logo + language + theme) but swaps the account
// menu for Sign in / Create account CTAs that return to the current page.
export function GuestHeader() {
  const { resolvedTheme, setTheme } = useTheme()
  const tNav = useTranslations("Nav")
  const pathname = usePathname()
  const callback = encodeURIComponent(pathname || "/")

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="glass-strong glass-header border-x-0 border-t-0 rounded-none">
        <div className="container flex items-center justify-between gap-3 md:gap-4 h-16">
          <Link href="/" className="flex items-center group shrink-0" aria-label="Genealogiq">
            <Image src="/logo-dark.png" alt="Genealogiq" width={120} height={28} className="block dark:hidden h-7 w-auto" priority />
            <Image src="/logo-light.png" alt="Genealogiq" width={120} height={28} className="hidden dark:block h-7 w-auto" priority />
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            <LanguageSwitcher />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              aria-label={tNav("toggleTheme")}
              className="rounded-full glass border-0 h-9 w-9"
            >
              <Sun className="h-4 w-4 hidden dark:block" />
              <Moon className="h-4 w-4 block dark:hidden" />
            </Button>

            {/* Equal-width CTAs: grid-cols-2 sizes both columns to the wider label,
                so the two buttons match in every locale. */}
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="ghost" size="sm" className="w-full rounded-full">
                <Link href={`/sign-in?callbackUrl=${callback}`}>{tNav("logIn")}</Link>
              </Button>

              <Button asChild size="sm" className="w-full rounded-full">
                <Link href={`/sign-up?callbackUrl=${callback}`}>{tNav("signUp")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
