import { cn } from "@/lib/utils"

interface AuroraBackdropProps {
  variant?: "page" | "top"
  intensity?: "soft" | "bold"
  className?: string
}

export function AuroraBackdrop({
  variant = "top",
  intensity = "soft",
  className,
}: AuroraBackdropProps) {
  const isPage = variant === "page"
  const isBold = intensity === "bold"

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none overflow-hidden z-0",
        isPage ? "fixed inset-0" : "absolute inset-x-0 top-0 h-[600px]",
        className,
      )}
    >
      <div
        className={cn(
          "absolute rounded-full blur-3xl will-change-transform",
          isBold
            ? "h-[560px] w-[560px] -top-36 -left-32 bg-[hsl(var(--brand-indigo)/0.42)]"
            : "h-[420px] w-[420px] -top-32 -left-24 bg-[hsl(var(--brand-indigo)/0.35)]",
        )}
        style={{ animation: "aurora-drift-a 18s ease-in-out infinite" }}
      />
      <div
        className={cn(
          "absolute rounded-full blur-3xl will-change-transform",
          isBold
            ? "h-[620px] w-[620px] -top-28 right-[-12%] bg-[hsl(var(--brand-slate)/0.48)]"
            : "h-[480px] w-[480px] -top-20 right-[-10%] bg-[hsl(var(--brand-slate)/0.4)]",
        )}
        style={{ animation: "aurora-drift-b 22s ease-in-out infinite" }}
      />
      {isBold && (
        <div
          className="absolute h-[460px] w-[460px] left-1/2 top-[18%] -translate-x-1/2 rounded-full blur-3xl bg-[hsl(var(--brand-indigo-deep)/0.24)] will-change-transform"
          style={{ animation: "aurora-drift-c 26s ease-in-out infinite" }}
        />
      )}
      {isBold && isPage && (
        <div
          className="absolute h-[500px] w-[500px] -bottom-40 -left-24 rounded-full blur-3xl bg-[hsl(var(--brand-slate-soft)/0.32)] will-change-transform"
          style={{ animation: "aurora-drift-b 30s ease-in-out infinite reverse" }}
        />
      )}
    </div>
  )
}
