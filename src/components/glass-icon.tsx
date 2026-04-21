import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface GlassIconProps {
  icon: LucideIcon
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeMap = {
  sm: "h-10 w-10 [&_svg]:h-5 [&_svg]:w-5",
  md: "h-14 w-14 [&_svg]:h-7 [&_svg]:w-7",
  lg: "h-16 w-16 [&_svg]:h-8 [&_svg]:w-8",
}

export function GlassIcon({ icon: Icon, size = "md", className }: GlassIconProps) {
  return (
    <span className={cn("glass-icon", sizeMap[size], className)}>
      <Icon strokeWidth={2} className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]" />
    </span>
  )
}
