import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { cn } from '@/lib/utils'
import { geist, spectral } from '@/fonts'
import '@/styles/globals.css'

import { ThemeProvider } from '@/components/theme/theme-provider'
import { TooltipProvider } from '@genealogiq/ui/tooltip'
import { Toaster } from "@genealogiq/ui/sonner"
import { CookieConsent } from '@/components/cookies/cookie-consent'

export const metadata: Metadata = {
  title: "Genealogiq | Sequoia",
  description: "Sequoia Business Management System",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html
      lang={locale}
      // ⬇️ trocamos `inter.variable` por geist (sans) + spectral (heading)
      className={cn("h-full", "antialiased", "font-sans", geist.variable, spectral.variable)}
      suppressHydrationWarning
    >
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <TooltipProvider>
              {children}
              <Toaster richColors />
              <CookieConsent />
            </TooltipProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
