import { AuroraBackdrop } from "@/components/aurora-backdrop"

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <AuroraBackdrop />
      <main className="container py-16 flex justify-center">
        {children}
      </main>
    </div>
  )
}
