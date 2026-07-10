'use client'

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { Moon, Sun, Menu, X, Bell, User, LogOut, Sprout, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { HeaderSearch } from "@/components/header-search"
import { LanguageSwitcher } from "@/components/language-switcher"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { signOut } from "next-auth/react"

function BellLink({ unreadCount }: { unreadCount: number }) {
  const t = useTranslations("Nav")
  return (
    <Link
      href="/messages"
      aria-label={unreadCount > 0 ? t("messagesUnread", { count: unreadCount }) : t("messages")}
      className="relative rounded-full glass border-0 h-9 w-9 inline-flex items-center justify-center hover:bg-accent/50 transition-colors"
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
          {unreadCount}
        </span>
      )}
    </Link>
  )
}

interface HeaderProps {
  userName?: string | null
  userImage?: string | null
  unreadCount?: number
}

export function Header({ userName, userImage, unreadCount = 0 }: HeaderProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const t = useTranslations("Nav")
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const pathname = usePathname()
  const showSearch = pathname !== "/home"

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : undefined

  const controls = (
    <>
      <BellLink unreadCount={unreadCount} />

      <LanguageSwitcher />

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        aria-label={t("toggleTheme")}
        className="rounded-full glass border-0 h-9 w-9"
      >
        <Sun className="h-4 w-4 hidden dark:block" />
        <Moon className="h-4 w-4 block dark:hidden" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label={t("userMenu")}
            className="rounded-full ring-2 ring-transparent hover:ring-primary/40 transition-all"
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={userImage ?? ""} alt={userName ?? "You"} />
              <AvatarFallback className="bg-secondary text-foreground text-sm font-medium">
                {initials ?? <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="glass-strong w-52">
          {userName && (
            <>
              <div className="px-2 py-1.5 text-sm font-medium truncate">{userName}</div>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem asChild>
            <Link href="/profile" className="gap-2 cursor-pointer">
              <User className="h-4 w-4" />
              {t("myProfile")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/subscriptions" className="gap-2 cursor-pointer">
              <Sprout className="h-4 w-4" />
              {t("subscriptions")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2 text-destructive focus:text-destructive cursor-pointer"
            onSelect={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="h-4 w-4" />
            {t("signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="glass-strong glass-header border-x-0 border-t-0 rounded-none">
        <div className="container flex items-center justify-between gap-3 md:gap-4 h-16">
          <Link href="/home" className="flex items-center group shrink-0" aria-label="Genealogiq">
            <Image src="/logo-dark.png" alt="Genealogiq" width={120} height={28} className="block dark:hidden h-7 w-auto" priority />
            <Image src="/logo-light.png" alt="Genealogiq" width={120} height={28} className="hidden dark:block h-7 w-auto" priority />
          </Link>

          {showSearch && (
            <div className="hidden md:block flex-1 max-w-md mx-auto">
              <HeaderSearch />
            </div>
          )}

          <div className="hidden md:flex items-center gap-2 shrink-0">{controls}</div>

          <button
            className="md:hidden rounded-full glass h-9 w-9 inline-flex items-center justify-center shrink-0"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={t("openMenu")}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        <div
          className={cn(
            "md:hidden overflow-hidden transition-[max-height,opacity] duration-300",
            mobileOpen ? "max-h-32 opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <div className="container flex items-center justify-end gap-2 pb-4 pt-2">
            {showSearch && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setSearchOpen(true); setMobileOpen(false) }}
                aria-label={t("searchProfiles")}
                className="rounded-full glass border-0 h-9 w-9"
              >
                <Search className="h-4 w-4" />
              </Button>
            )}
            {controls}
          </div>
        </div>
      </div>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-md p-4 top-[15%] translate-y-0">
          <DialogTitle className="sr-only">{t("searchProfiles")}</DialogTitle>
          <HeaderSearch onNavigate={() => setSearchOpen(false)} />
        </DialogContent>
      </Dialog>
    </header>
  )
}
