'use client'

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface Props {
  images: Array<{ id: string; url: string }>
}

export function BioImageCarousel({ images }: Props) {
  const t = useTranslations("Bio")
  const [startIdx, setStartIdx] = useState(0)
  const [cols, setCols]         = useState(2)   // 2 on xs/sm, 3 on md+
  const touchX                  = useRef(0)

  useEffect(() => {
    const mq     = window.matchMedia("(min-width: 768px)")
    const update = (e: MediaQueryListEvent | MediaQueryList) => setCols(e.matches ? 3 : 2)
    update(mq)
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  const n          = images.length
  const canNavigate = n > cols

  const prev = () => setStartIdx((i) => (i - 1 + n) % n)
  const next = () => setStartIdx((i) => (i + 1) % n)

  // Stable position keys so React updates src in-place instead of remounting.
  const visible = Array.from({ length: Math.min(cols, n) }, (_, pos) => ({
    pos,
    img: images[(startIdx + pos) % n],
  }))

  const arrowClass =
    "hidden lg:inline-flex shrink-0 h-10 w-10 rounded-full bg-background/90 border border-border/60 shadow-md items-center justify-center hover:bg-background transition-opacity"

  return (
    <div
      className="flex items-center gap-2"
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX }}
      onTouchEnd={(e) => {
        if (!canNavigate) return
        const dx = touchX.current - e.changedTouches[0].clientX
        if (Math.abs(dx) > 40) dx > 0 ? next() : prev()
      }}
    >
      {canNavigate && (
        <button type="button" onClick={prev} aria-label={t("carouselPrevious")} className={arrowClass}>
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      <div
        className="flex-1 grid gap-4"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {visible.map(({ pos, img }) => (
          <div key={`pos-${pos}`} className="glass-card no-sheen p-2">
            <div className="overflow-hidden rounded-2xl bg-muted/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={t("photoAlt")}
                className="block w-full h-auto"
                loading="lazy"
              />
            </div>
          </div>
        ))}
      </div>

      {canNavigate && (
        <button type="button" onClick={next} aria-label={t("carouselNext")} className={arrowClass}>
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
