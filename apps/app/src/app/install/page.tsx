import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { InstallClient } from "@/components/install-client"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("InstallPrompt")
  return { title: t("title") }
}

export default function InstallPage() {
  return <InstallClient />
}
