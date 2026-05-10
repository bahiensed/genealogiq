'use client'

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { Moon, Sun, Menu, X, Bell, User, LogOut, Flower2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { HeaderSearch } from "@/components/header-search"
import { cn } from "@/lib/utils"
import { logout } from "@/actions/auth"
import type { TributeNotification } from "@/queries/tribute"

interface BellProps {
  notifications: TributeNotification[]
  totalPending: number
}

function BellNotification({ notifications, totalPending }: BellProps) {
  if (notifications.length === 0) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Notifications"
        className="rounded-full glass border-0 h-9 w-9"
      >
        <Bell className="h-4 w-4" />
      </Button>
    )
  }

  if (notifications.length === 1) {
    return (
      <Link
        href={`/profile/${notifications[0].profileId}/tributes/moderate`}
        aria-label={`${totalPending} pending tribute${totalPending > 1 ? "s" : ""}`}
        className="relative rounded-full glass border-0 h-9 w-9 inline-flex items-center justify-center hover:bg-accent/50 transition-colors"
      >
        <Bell className="h-4 w-4" />
        <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
          {totalPending}
        </span>
      </Link>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`${totalPending} pending tributes`}
          className="relative rounded-full glass border-0 h-9 w-9 inline-flex items-center justify-center hover:bg-accent/50 transition-colors"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
            {totalPending}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-strong w-64">
        <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">Pending tributes</div>
        <DropdownMenuSeparator />
        {notifications.map((n) => (
          <DropdownMenuItem key={n.profileId} asChild>
            <Link href={`/profile/${n.profileId}/tributes/moderate`} className="gap-2 cursor-pointer">
              <Flower2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="flex-1 truncate">{n.name}</span>
              <span className="shrink-0 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {n.count}
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface HeaderProps {
  userName?: string | null
  userImage?: string | null
  notifications?: TributeNotification[]
}

export function Header({ userName, userImage, notifications = [] }: HeaderProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const showSearch = pathname !== "/home"

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : undefined

  const totalPending = notifications.reduce((sum, n) => sum + n.count, 0)

  const controls = (
    <>
      <BellNotification notifications={notifications} totalPending={totalPending} />

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        aria-label="Toggle theme"
        className="rounded-full glass border-0 h-9 w-9"
      >
        <Sun className="h-4 w-4 hidden dark:block" />
        <Moon className="h-4 w-4 block dark:hidden" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="User menu"
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
              My profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2 text-destructive focus:text-destructive cursor-pointer"
            onSelect={() => logout()}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="glass-strong border-x-0 border-t-0 rounded-none">
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
            aria-label="Open menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {showSearch && (
          <div className="md:hidden border-t border-border/40">
            <div className="container py-2">
              <HeaderSearch />
            </div>
          </div>
        )}

        <div
          className={cn(
            "md:hidden overflow-hidden transition-[max-height,opacity] duration-300",
            mobileOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <div className="container flex items-center justify-end gap-2 pb-4 pt-1">{controls}</div>
        </div>
      </div>
    </header>
  )
}
