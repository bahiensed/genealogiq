'use client'

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useTheme } from "next-themes"
import { Moon, Sun, Menu, X, Bell, User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { logout } from "@/actions/auth"

interface HeaderProps {
  userName?: string | null
  userImage?: string | null
}

export function Header({ userName, userImage }: HeaderProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : undefined

  const controls = (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Notifications"
        className="rounded-full glass border-0 h-9 w-9"
      >
        <Bell className="h-4 w-4" />
      </Button>

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
        <div className="container flex items-center justify-between h-16">
          <Link href="/home" className="flex items-center group" aria-label="Genealogiq">
            <Image src="/logo-dark.png" alt="Genealogiq" width={120} height={28} className="h-7 w-auto block dark:hidden object-contain" style={{ width: "auto" }} />
            <Image src="/logo-light.png" alt="Genealogiq" width={120} height={28} className="h-7 w-auto hidden dark:block object-contain" style={{ width: "auto" }} />
          </Link>

          <div className="hidden md:flex items-center gap-2">{controls}</div>

          <button
            className="md:hidden rounded-full glass h-9 w-9 inline-flex items-center justify-center"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Open menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        <div
          className={cn(
            "md:hidden overflow-hidden transition-[max-height,opacity] duration-300",
            mobileOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <div className="container flex items-center gap-2 pb-4 pt-1">{controls}</div>
        </div>
      </div>
    </header>
  )
}
