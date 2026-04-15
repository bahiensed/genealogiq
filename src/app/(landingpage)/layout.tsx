import Link from "next/link"
import { auth } from "@/auth"
import { getCurrentYear } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/search/search-input"
import { ModeToggle } from "@/components/theme/mode-toggle"

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()
  const currentYear = getCurrentYear()

  return (
    <h1>Genealogiq</h1>
  )
}
