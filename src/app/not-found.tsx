import Link from "next/link"
import { Ghost } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center px-4">
      <Ghost className="h-16 w-16 text-muted-foreground opacity-40" />
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight">Page not found</h1>
        <p className="text-muted-foreground">
          The page you are looking for does not exist or has been removed.
        </p>
      </div>
      <Button asChild>
        <Link href="/home">Go home</Link>
      </Button>
    </div>
  )
}
