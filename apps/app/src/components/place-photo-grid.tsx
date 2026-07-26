'use client'

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

interface Props {
  photos: string[]
  title: string
}

// Masonry grid + full-screen lightbox for a single place's photos. Mirrors
// gallery-client.tsx's grid+lightbox mechanics, minus what doesn't apply here
// (video, sort, pagination, anon gating — a place has at most PLACE_MAX_PHOTOS
// images and this page is already gated as a whole).
export function PlacePhotoGrid({ photos, title }: Props) {
  const t = useTranslations("Places")
  const tc = useTranslations("Common")
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const isOpen = lightboxIndex !== null

  const goPrev = () => setLightboxIndex((i) => (i === null ? null : (i - 1 + photos.length) % photos.length))
  const goNext = () => setLightboxIndex((i) => (i === null ? null : (i + 1) % photos.length))

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev()
      else if (e.key === "ArrowRight") goNext()
      else if (e.key === "Escape") setLightboxIndex(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  if (photos.length === 0) return null

  return (
    <>
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
        {photos.map((url, i) => (
          <button
            key={url}
            type="button"
            onClick={() => setLightboxIndex(i)}
            className="mb-4 break-inside-avoid w-full block rounded-2xl overflow-hidden border border-border/60 bg-card/40 transition-transform hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={t("photoAlt", { number: i + 1 })} loading="lazy" className="w-full h-auto block" />
          </button>
        ))}
      </div>

      <Dialog open={isOpen} onOpenChange={(o) => !o && setLightboxIndex(null)}>
        <DialogContent className="max-w-[100vw] w-screen h-screen sm:max-w-[95vw] sm:h-[90vh] p-0 bg-background/95 backdrop-blur-xl border-border/60 [&>button]:hidden">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          {lightboxIndex !== null && (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={photos[lightboxIndex]}
                src={photos[lightboxIndex]}
                alt={t("photoAlt", { number: lightboxIndex + 1 })}
                className="max-h-[90vh] sm:max-h-[85vh] max-w-full object-contain block"
              />

              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="absolute top-4 right-4 h-10 w-10 inline-flex items-center justify-center rounded-full bg-background/80 backdrop-blur-md border border-border/60 hover:bg-accent transition"
                aria-label={tc("close")}
              >
                <X className="h-5 w-5" />
              </button>

              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goPrev}
                    className="hidden md:inline-flex absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 items-center justify-center rounded-full bg-background/80 backdrop-blur-md border border-border/60 hover:bg-accent transition"
                    aria-label={t("previous")}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="hidden md:inline-flex absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 items-center justify-center rounded-full bg-background/80 backdrop-blur-md border border-border/60 hover:bg-accent transition"
                    aria-label={tc("next")}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium bg-background/80 backdrop-blur-md border border-border/60">
                    {lightboxIndex + 1} / {photos.length}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
