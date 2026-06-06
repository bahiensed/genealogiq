import type { Metadata } from 'next'
import { cn } from '@/lib/utils'
import { inter } from '@/fonts'
import '@/styles/globals.css'

import { ThemeProvider } from '@/components/theme/theme-provider'
import { TooltipProvider } from '@genealogiq/ui/tooltip'
import { Toaster } from "@genealogiq/ui/sonner"
import { CookieConsent } from '@/components/cookies/cookie-consent'

export const metadata: Metadata = {
  title: "Genealogiq | Sequoia",
  description: "Sequoia Business Management System",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", "font-sans", inter.variable)}
      suppressHydrationWarning
    >
      <body>
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
      </body>
    </html>
  )
}
