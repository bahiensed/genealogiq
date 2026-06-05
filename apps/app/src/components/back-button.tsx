import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface BackButtonProps {
  href: string
  label?: string
  className?: string
}

export function BackButton({ href, label = "Back", className }: BackButtonProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={cn(
        "shrink-0 inline-flex items-center justify-center h-9 w-9 md:h-10 md:w-10 rounded-full",
        "bg-card/60 backdrop-blur-md border border-border/60 text-foreground/80",
        "hover:bg-card hover:text-foreground hover:border-border hover:-translate-x-0.5",
        "transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
    </Link>
  )
}
