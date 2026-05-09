import { ModeToggle } from "@/components/theme/mode-toggle"

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[var(--gradient-hero)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full blur-3xl"
        style={{ background: '#7B90AB30' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full blur-3xl"
        style={{ background: '#61619830' }}
      />

      <div className="relative z-10 flex justify-end p-4">
        <ModeToggle />
      </div>
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center p-4">
        {children}
      </main>
    </div>
  )
}
