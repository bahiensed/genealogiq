import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { inter } from '@/fonts'
import { cn } from '@/lib/utils'
import '@/styles/globals.css'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { Footer } from "@/components/footer"
import { RegisterServiceWorker } from "@/components/register-service-worker"
import { PwaInstallDialog } from "@/components/pwa-install-dialog"

export const metadata: Metadata = {
  title: "Genealogiq",
  description: "Genealogiq",
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Genealogiq",
    statusBarStyle: "default",
  },
}

export const viewport: Viewport = {
  // Light: --brand-indigo; dark: the dark --background hsl(240 24% 18%).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#616198" },
    { media: "(prefers-color-scheme: dark)", color: "#232339" },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html
      lang={locale}
      className={cn("h-full", "antialiased", "font-sans", inter.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
          >
            <TooltipProvider>
              <div className="flex-1 flex flex-col">{children}</div>
              <Footer />
              <Toaster richColors />
              <RegisterServiceWorker />
              <PwaInstallDialog />
            </TooltipProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
