"use client"

import { useEffect, useState } from "react"
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  isSupportedLocale,
  type SupportedLocale,
} from "@genealogiq/i18n"
import { captureBoundaryError } from "@/lib/observability"

// Replaces the root layout when the root layout/template itself throws, so it runs
// ABOVE all providers (no next-intl, no theme): styles stay inline. next-intl's
// useTranslations needs the provider that just crashed, so the copy is mirrored
// inline here and the locale is read straight from the `locale` cookie. Keep these
// strings in sync with each app's `Errors` namespace.
const MESSAGES: Record<SupportedLocale, { title: string; description: string; retry: string }> = {
  "en-US": {
    title: "Something went wrong",
    description: "An unexpected error occurred. Please try again.",
    retry: "Try again",
  },
  "pt-BR": {
    title: "Algo deu errado",
    description: "Ocorreu um erro inesperado. Tente novamente.",
    retry: "Tentar de novo",
  },
  "es-MX": {
    title: "Algo salió mal",
    description: "Ocurrió un error inesperado. Inténtalo de nuevo.",
    retry: "Intentar de nuevo",
  },
}

function readLocale(): SupportedLocale {
  if (typeof document === "undefined") return DEFAULT_LOCALE
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE_NAME}=([^;]*)`))
  const value = match ? decodeURIComponent(match[1]) : null
  return isSupportedLocale(value) ? value : DEFAULT_LOCALE
}

export default function GlobalError({
  error,
  reset,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  reset?: () => void
  unstable_retry?: () => void
}) {
  // Server render + first client paint use the default; the cookie locale lands after
  // mount (no hydration mismatch — both start from DEFAULT_LOCALE).
  const [locale, setLocale] = useState<SupportedLocale>(DEFAULT_LOCALE)
  const t = MESSAGES[locale]

  useEffect(() => {
    captureBoundaryError(error)
    setLocale(readLocale())
  }, [error])

  const retry = unstable_retry ?? reset

  return (
    <html lang={locale}>
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 16,
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <title>{t.title}</title>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{t.title}</h1>
        <p style={{ color: "#6b7280", margin: 0 }}>{t.description}</p>
        {retry && (
          <button
            onClick={() => retry()}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            {t.retry}
          </button>
        )}
      </body>
    </html>
  )
}
