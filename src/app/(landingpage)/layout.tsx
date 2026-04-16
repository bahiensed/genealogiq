import Link from "next/link"
import { auth } from "@/auth"
import { getCurrentYear } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/theme/mode-toggle"

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()
  const currentYear = getCurrentYear()

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex border-b items-center justify-between px-4 py-2">
        Genealogiq
        <div className="flex gap-4 items-center">
          <ModeToggle />
          {session ? (
            <Button variant="outline" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button variant="outline" asChild>
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-4">
        {children}
      </main>

      <footer className="border-t flex flex-col gap-2 p-4 text-center text-muted-foreground text-xs">
        <div>
          <Link href="/privacy" className="underline-offset-4 hover:underline">
            Privacy Policy
          </Link>

          {" | "}

          <Link href="/terms" className="underline-offset-4 hover:underline">
            Terms of Use
          </Link>
        </div>

        <div>
          © &nbsp;
          <Link href="/privacy" className="underline-offset-4 hover:underline">
            Genealogic Global Ltd.
          </Link>
          , {currentYear}
        </div>
      </footer>
    </div>
  )
}
